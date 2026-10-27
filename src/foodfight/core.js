'use strict';
/* Mystery Meat Time: Atari Food Fight (1983) rules, drawn as a cafeteria food fight on her school lunch menu.
   Rules follow the original cabinet: Charley Chuck (a boy in blue) starts at the left and must reach the ice cream
   cone on the right before it melts (32 seconds); the chefs Angelo and Zorba come up out of the manholes on level 1,
   Oscar joins on level 2 and Jacques on level 3; chefs chase him, and from level 2 pick up food from the piles and throw
   it at him (on level 1 they never carry food); walking over a pile picks up one piece (the watermelon pile never runs
   out), and he throws it in the stick's direction, one of eight; standing on a pile with fire held throws piece after
   piece until the pile is gone; a handful of peas fires several fast shots that spread out and fall short, a watermelon is heavy: slow, short and it
   knocks down every chef in its way; a chef hit by food or lured into an open manhole drops out and comes back up
   out of a manhole a few seconds later; touching a chef, being hit by food, stepping into an open manhole or letting
   the cone melt loses a life; food still in hand carries over to the next level. Levels add manholes (3 to 10)
   and food piles (up to 8); from level 5 one food type takes over; after level 6 the cone moves.
   Scoring by the cabinet's table: chefs hit with food 100 for the first, 200 for the second and so on up to 1,000;
   a chef in a manhole 200; the cone 500 times the level, up to 25,000; 100 for every piece of food left on the
   screen when the cone is eaten (watermelons do not count); three lives, an extra life at 25,000, then at 100,000 and every
   multiple of 100,000 (200,000, 300,000 and so on).
   Sources (checked 2026-10-26): the cabinet's own program, rev 2 ROMs 136020-201..208 (github historicalsource/food-fight),
   disassembled: its add-score routine works in hundreds; a chef hit pays a counter that rises 1 to 10 (100 to 1,000) and is
   cleared when a screen is set up; a chef in a manhole 2 (200); the cone level x 5 capped at 250 (25,000; level max 125); each
   piece of leftover food 1 (100); bonus lives at the first bonus stage, then at every multiple of the higher stage. Factory
   settings from the operator's manual (archive.org arcademanual_foodfight): 3 lives, bonus stages 25,000 and 100,000, "bonus
   lives are awarded at 25,000; 100,000; 200,000; 300,000; etc." Whether watermelons count as leftovers was not traced.
   Cabinet review 2026-10-31 (StrategyWiki Food Fight walkthrough): "On Level 1 there are only two chefs and they won't pick
   up any food", three on level 2, four from level 3; "Chuck can just stand on a pile of food and throw in any direction at
   machine gun speed ... until all of the food in a pile is gone"; "peas spread out when thrown and won't go as far";
   32 seconds for the cone (StrategyWiki Food Fight).
   Adaptations (not ROM-exact): the chef count for hits restarts with every life and level; manholes open only while
   a chef comes up (and a little after), never the one he stands on; speeds, throw timing and pile sizes tuned by eye at 120 Hz; the starting
   level menu, the harmless blue and yellow chefs and the instant replay are left out. */
(function(g){
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['axis','n',-1,1,20],['axisY','n',-1,1,20],['fire','b']],
  left:40,right:984,top:96,bottom:744,
  playerSpeed:210,playerR:18,chefR:20,startX:90,
  coneX:930,coneR:24,meltTime:32,
  holeR:26,holesFirst:3,holesMax:10,pileR:30,pileSize:5,pilesFirst:6,pilesMax:8,
  foods:Object.freeze({pie:Object.freeze({speed:640,r:14,range:1000}),tomato:Object.freeze({speed:720,r:12,range:1000}),banana:Object.freeze({speed:680,r:13,range:1000}),
   peas:Object.freeze({speed:900,r:7,range:420,shots:5,rate:.09,spread:.1}),melon:Object.freeze({speed:360,r:28,range:330})}),pileRepeat:.15,chefsCarryFrom:2,
  kinds:Object.freeze(['pie','tomato','banana','peas']),
  chefs:Object.freeze(['angelo','zorba','oscar','jacques']),chefFrom:Object.freeze([1,1,2,3]),
  chefSpeed:120,chefSpeedUp:8,chefSpeedMax:200,chefThrow:.7,chefRange:460,chefAim:.2,chefCool:Object.freeze([1.3,.06,.6]),
  chefReturn:3,riseTime:.7,holeAfter:2.4,
  points:Object.freeze({chefStep:100,chefMax:1000,manhole:200,cone:500,coneMax:25000,leftover:100}),
  lives:3,firstExtra:25000,extraEvery:100000,deathPause:2,levelDelay:1.6});
class SeededRandom{constructor(seed=1981){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const C=CONFIG,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),midY=(C.top+C.bottom)/2;
// The stick's direction rounded to one of eight, as a unit vector.
const dir8=(x,y)=>{const a=Math.round(Math.atan2(y,x)/(Math.PI/4))*(Math.PI/4);return{x:Math.round(Math.cos(a)*1e6)/1e6,y:Math.round(Math.sin(a)*1e6)/1e6}};
class FoodFightEngine{
 constructor(seed=1981){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=C.lives;this.nextExtra=C.firstExtra;this.level=0;this.throws=0;
  this.held=null;this.fireWas=false;this.repeat=0;this.state='play';this.timer=0;this.newLevel();return this}
 rand(a,b){return a+(b-a)*this.rng.next()}
 // A free spot on the floor, clear of everything already placed, the start and the cone.
 spot(taken,gap,x0=220,x1=820){for(let i=0;i<200;i++){const p={x:this.rand(x0,x1),y:this.rand(C.top+50,C.bottom-50)};if(dist(p,{x:C.startX,y:midY})>130&&dist(p,this.cone)>120&&taken.every(o=>dist(o,p)>gap))return p}return{x:this.rand(x0,x1),y:this.rand(C.top+50,C.bottom-50)}}
 newLevel(){this.level++;const L=this.level;
  this.cone={x:C.coneX,y:L>6?this.rand(C.top+60,C.bottom-60):midY};
  const taken=[];this.holes=[...Array(Math.min(C.holesMax,C.holesFirst+L-1))].map(()=>{const p=this.spot(taken,110);taken.push(p);return{x:p.x,y:p.y,open:0}});
  // Piles: one watermelon pile that never runs out, the rest random; from level 5 one kind takes over.
  const n=Math.min(C.pilesMax,C.pilesFirst+Math.floor((L-1)/2)),main=C.kinds[Math.floor(this.rng.next()*4)];
  this.piles=[...Array(n)].map((_,i)=>{const p=this.spot(taken,100,160,860);taken.push(p);const kind=i===0?'melon':L>=5&&this.rng.next()<.6?main:C.kinds[Math.floor(this.rng.next()*4)];return{x:p.x,y:p.y,kind,count:kind==='melon'?Infinity:C.pileSize}});
  this.startLife();this.events.push({type:'level',level:L})}
 startLife(){this.player={x:C.startX,y:midY,face:{x:1,y:0},moving:false};this.food=[];this.melt=C.meltTime;this.chain=0;for(const h of this.holes)h.open=0;
  this.chefs=C.chefs.filter((_,i)=>C.chefFrom[i]<=this.level).map((name,i)=>({name,state:'wait',timer:.6+i*.9,x:0,y:0,hole:null,carry:null,cool:1,wob:0,wobT:0}))}
 award(n){this.score+=n;while(this.score>=this.nextExtra){this.nextExtra=(Math.floor(this.nextExtra/C.extraEvery)+1)*C.extraEvery;this.lives++;this.events.push({type:'extra'})}}
 chefSpeed(){return Math.min(C.chefSpeedMax,C.chefSpeed+C.chefSpeedUp*(this.level-1))}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  if(this.state==='dead'||this.state==='cleared'){this.timer-=dt;if(this.timer<=0){if(this.state==='cleared')this.newLevel();else this.startLife();this.state='play'}return}
  for(const h of this.holes)h.open=Math.max(0,h.open-dt);
  this.movePlayer(dt,input);this.fire(dt,input);this.moveChefs(dt);this.moveFood(dt);
  if(this.state!=='play')return;
  this.melt-=dt;if(this.melt<=0){this.melt=0;return this.die('melt')}
  if(dist(this.player,this.cone)<C.playerR+C.coneR)this.eatCone()}
 movePlayer(dt,input){const p=this.player,ax=clamp(Number(input.axis)||0,-1,1)||((input.right?1:0)-(input.left?1:0)),ay=clamp(Number(input.axisY)||0,-1,1)||((input.down?1:0)-(input.up?1:0)),m=Math.hypot(ax,ay);
  p.moving=m>.1;if(p.moving){const k=Math.min(1,m)/m;p.x=clamp(p.x+ax*k*C.playerSpeed*dt,C.left+C.playerR,C.right-C.playerR);p.y=clamp(p.y+ay*k*C.playerSpeed*dt,C.top+C.playerR,C.bottom-C.playerR);p.face=dir8(ax,ay)}
  // Walking over a pile with empty hands picks up one piece; a handful of peas is several shots.
  if(!this.held)for(const pl of this.piles)if(pl.count>0&&dist(p,pl)<C.pileR){if(pl.count!==Infinity)pl.count--;this.held={kind:pl.kind,n:pl.kind==='peas'?C.foods.peas.shots:1};this.events.push({type:'pickup',kind:pl.kind});break}
  for(const h of this.holes)if(h.open>0&&dist(p,h)<C.holeR*.7)return this.die('hole',h)}
 // Throws go the way the stick points, else the way he faces; peas keep coming while fire is held.
 fire(dt,input){const f=!!input.fire,press=f&&!this.fireWas;this.fireWas=f;this.repeat-=dt;if(!this.held||!f)return;
  // Standing on a pile with fire held throws again and again (the cabinet's machine gun), as do peas.
  const onPile=this.piles.some(pl=>pl.count>0&&dist(this.player,pl)<C.pileR);
  if(!press&&!((this.held.kind==='peas'||onPile)&&this.repeat<=0))return;const peas=this.held.kind==='peas';this.repeat=peas?C.foods.peas.rate:C.pileRepeat;
  // A handful of peas spreads out: each pea a little off the line, in turn.
  let d=this.player.face;if(peas){const k=C.foods.peas.shots-this.held.n,a=Math.atan2(d.y,d.x)+(k-(C.foods.peas.shots-1)/2)*C.foods.peas.spread;d={x:Math.cos(a),y:Math.sin(a)}}
  this.throwFood(this.player,d,this.held.kind,'player');this.throws++;if(--this.held.n<=0)this.held=null}
 throwFood(from,d,kind,owner){const F=C.foods[kind],s=F.speed*(owner==='chef'?C.chefThrow:1),r=owner==='chef'?C.chefR:C.playerR;
  this.food.push({x:from.x+d.x*r,y:from.y+d.y*r,vx:d.x*s,vy:d.y*s,kind,owner,left:F.range,hit:[]});this.events.push({type:'throw',kind,owner})}
 moveChefs(dt){const p=this.player,v=this.chefSpeed();
  for(const c of this.chefs){
   if(c.state==='wait'){c.timer-=dt;if(c.timer<=0)this.emerge(c);continue}
   if(c.state==='rise'){c.timer-=dt;if(c.timer<=0)c.state='walk'}
   else{// Chase him, with a little wander so they do not stack; an empty-handed chef detours to a pile close by.
    c.wobT-=dt;if(c.wobT<=0){c.wobT=.5;c.wob=this.rand(-.6,.6)}
    const carry=this.level>=C.chefsCarryFrom;let t=p;if(!c.carry&&carry){const pl=this.piles.find(q=>q.count>0&&dist(q,c)<110);if(pl)t=pl}
    const a=Math.atan2(t.y-c.y,t.x-c.x)+c.wob;c.x=clamp(c.x+Math.cos(a)*v*dt,C.left,C.right);c.y=clamp(c.y+Math.sin(a)*v*dt,C.top,C.bottom);
    if(!c.carry&&carry)for(const pl of this.piles)if(pl.count>0&&dist(c,pl)<C.pileR){if(pl.count!==Infinity)pl.count--;c.carry=pl.kind;break}
    if(c.hole&&dist(c,c.hole)>C.holeR*1.6)c.hole=null;
    // A chef who walks over an open manhole other than his own falls in.
    const h=this.holes.find(h=>h!==c.hole&&h.open>0&&dist(c,h)<C.holeR*.7);if(h){this.award(C.points.manhole);this.events.push({type:'manhole',points:C.points.manhole,x:h.x,y:h.y,name:c.name});this.knockOut(c);continue}
    c.cool-=dt;if(c.carry&&c.cool<=0&&this.state==='play'){const dx=p.x-c.x,dy=p.y-c.y,d=Math.hypot(dx,dy),a8=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*(Math.PI/4);
     if(d<C.chefRange&&Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-a8),Math.cos(Math.atan2(dy,dx)-a8)))<C.chefAim){this.throwFood(c,dir8(dx,dy),c.carry,'chef');c.carry=null;c.cool=Math.max(C.chefCool[2],C.chefCool[0]-C.chefCool[1]*this.level)}}}
   if(this.state==='play'&&(c.state==='walk'||c.timer<C.riseTime/2)&&dist(c,p)<C.playerR+C.chefR-6)return this.die('chef')}}
 // A chef comes up out of a random manhole, which stays open a little while after; never right under the boy, so no chef or open hole lands on him unseen.
 emerge(c){const n=this.holes.length,i0=Math.floor(this.rng.next()*n);let h=this.holes[i0];for(let i=0;i<n;i++){const k=this.holes[(i0+i)%n];if(dist(k,this.player)>C.chefR+C.playerR+C.holeR+40){h=k;break}}c.state='rise';c.timer=C.riseTime;c.x=h.x;c.y=h.y;c.hole=h;c.carry=null;c.cool=1;h.open=Math.max(h.open,C.riseTime+C.holeAfter);this.events.push({type:'emerge',name:c.name})}
 knockOut(c){c.state='wait';c.timer=C.chefReturn;c.carry=null;c.hole=null}
 hitChef(c,f){this.chain++;const pts=Math.min(C.points.chefMax,C.points.chefStep*this.chain);this.award(pts);this.events.push({type:'hit',points:pts,chain:this.chain,kind:f.kind,x:c.x,y:c.y,name:c.name});this.knockOut(c)}
 moveFood(dt){const p=this.player;
  for(const f of this.food){const s=Math.hypot(f.vx,f.vy)*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.left-=s;const r=C.foods[f.kind].r;
   if(f.owner==='player'){for(const c of this.chefs)if(c.state!=='wait'&&!f.hit.includes(c)&&dist(c,f)<C.chefR+r){f.hit.push(c);this.hitChef(c,f);if(f.kind!=='melon'){f.left=0;break}}}
   else if(this.state==='play'&&dist(p,f)<C.playerR+r-2){f.left=0;this.die('food')}}
  for(const f of this.food)if(f.left<=0||f.x<C.left-40||f.x>C.right+40||f.y<C.top-40||f.y>C.bottom+40){f.left=0;this.events.push({type:'splat',kind:f.kind,x:f.x,y:f.y})}
  this.food=this.food.filter(f=>f.left>0)}
 // The cone: 500 times the level (up to 25,000), plus 100 for every piece of food still on the floor except watermelons.
 eatCone(){const pts=Math.min(C.points.coneMax,C.points.cone*this.level),left=this.piles.reduce((n,pl)=>n+(pl.count===Infinity?0:pl.count),0),bonus=left*C.points.leftover;
  this.award(pts);this.award(bonus);this.state='cleared';this.timer=C.levelDelay;this.food=[];this.events.push({type:'cone',points:pts,leftover:left,bonus,melt:this.melt,level:this.level,x:this.cone.x,y:this.cone.y})}
 die(cause,h){this.lives--;this.held=null;this.events.push({type:'death',cause,x:h?h.x:this.player.x,y:h?h.y:this.player.y,lives:this.lives});
  if(this.lives<=0){this.state='end';this.events.push({type:'gameover',score:this.score})}else{this.state='dead';this.timer=C.deathPause}}
 // Demo pilot: grabs food on the way, throws at any chef lined up, steers around chefs, flying food and open manholes, and heads for the cone.
 pilot(){const p=this.player,live=this.chefs.filter(c=>c.state!=='wait');let tx=this.cone.x-p.x,ty=this.cone.y-p.y;
  if(!this.held&&this.melt>9){const pl=this.piles.filter(q=>q.count>0&&q.x>p.x-80).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(pl&&dist(pl,p)<300){tx=pl.x-p.x;ty=pl.y-p.y}}
  let n=Math.hypot(tx,ty)||1,ax=tx/n,ay=ty/n;
  const push=(o,range,k)=>{const dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy)||1;if(d<range){ax+=dx/d*k*(range-d)/range;ay+=dy/d*k*(range-d)/range}};
  for(const c of live)push(c,170,2.2);for(const h of this.holes)if(h.open>0)push(h,75,3);// Food coming his way: step sideways off its line before it arrives.
  for(const f of this.food){if(f.owner!=='chef')continue;const v=Math.hypot(f.vx,f.vy)||1,ux=f.vx/v,uy=f.vy/v,rx=p.x-f.x,ry=p.y-f.y,ahead=rx*ux+ry*uy,side=rx*-uy+ry*ux;
   if(ahead>-10&&ahead<v*.9&&Math.abs(side)<C.playerR+C.foods[f.kind].r+26){const s=side>=0?1:-1;ax+=-uy*s*4;ay+=ux*s*4}}
  if(this.held){for(const c of live){const dx=c.x-p.x,dy=c.y-p.y,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx),a8=Math.round(a/(Math.PI/4))*(Math.PI/4);
   if(d<520&&Math.abs(Math.atan2(Math.sin(a-a8),Math.cos(a-a8)))<.12){const v=dir8(dx,dy);return{axis:v.x,axisY:v.y,fire:this.held.kind==='peas'||!this.fireWas}}}}
  n=Math.hypot(ax,ay)||1;return{axis:ax/n,axisY:ay/n,fire:false}}
 snapshot(){return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,lives:this.lives,level:this.level,throws:this.throws,melt:+this.melt.toFixed(3),
  player:{x:+this.player.x.toFixed(2),y:+this.player.y.toFixed(2)},held:this.held&&this.held.kind,chefs:this.chefs.map(c=>[c.name,c.state,+c.x.toFixed(1),+c.y.toFixed(1)]),
  piles:this.piles.map(p=>[p.kind,p.count===Infinity?-1:p.count]),holes:this.holes.length,food:this.food.length}}
}
const FoodFightCore={CONFIG,FoodFightEngine,SeededRandom,dir8};
g.FoodFightCore=FoodFightCore;if(typeof module!=='undefined')module.exports=FoodFightCore;
})(globalThis);
