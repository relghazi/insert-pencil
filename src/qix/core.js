'use strict';
/* Quiz: Taito Qix (1981) rules, drawn as her pencil claiming bubbles on a blank answer sheet while a red scribble wanders.
   Rules follow the original cabinet: the marker runs along the border of the claimed area; holding Fast Draw or Slow
   Draw and pushing into the open field draws Stix behind it, and the marker cannot cross or touch its own line; when
   the line reaches the border again the side without the Qix is claimed (filled blue for fast, purple for slow) and
   scores 250 for every percent of the field it claims, slow-drawn shapes 500; switching to fast during a slow line makes it a fast one; while
   drawing, releasing the button stops the marker, and if it stops a Fuse lights at the start of the line and burns
   along it, killing the marker when it arrives; it stops as soon as the marker moves again and, if the marker stops
   again, burns on from where it stopped; the Qix wanders the
   open field, bouncing off claimed area, and kills the marker if it touches the marker or the unfinished line while
   drawing; two Sparx start at the top of the border and run along it in opposite directions, killing the marker on
   contact; when the red time line at the top runs out (37 seconds) two more Sparx join (four at most), and when it
   runs out again they all become Super Sparx that run faster, chase the
   marker and can follow it out along its unfinished line; a lost life erases the line and puts the marker back where
   it started; claiming 75 percent or more clears the level, with a bonus of 1,000 for every percent over 75; from
   level 3 there are two Qix, and claiming a shape that splits them into separate areas ends the level at once and
   raises the score multiplier for every later shape (x2, x3 and so on up to x9), with no percentage bonus for that level.
   Three lives and no extra lives (the Taito operator manual and the MAME CMOS defaults have no extra life setting;
   75 percent threshold and 3 turns are the factory defaults; area points per percent and the bonus from the MAME
   history text on arcade-history.com, checked 2026-10-26; the time line, the Fuse that waits where it stopped and the
   x9 cap from the Atari port's manual, StrategyWiki and Wikipedia, checked 2026-10-31).
   Adaptations (not ROM-exact): the field is a grid of 240 by 168 cells of 4 units on the 4:3 page; the Qix is two bouncing end points with a fading trail;
   all speeds are tuned by eye at 120 Hz. */
(function(g){
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['axis','n',-1,1,20],['axisY','n',-1,1,20],['fast','b'],['slow','b']],
  cell:4,cols:240,rows:168,left:32,top:80,threshold:75,bonusPerPercent:1000,
  points:Object.freeze({fast:250,slow:500}),
  markerSpeed:160,slowSpeed:80,fuseDelay:.45,fuseSpeed:90,
  qixSpeed:130,qixSpeedUp:12,qixMaxSpeed:250,qixMaxLen:150,qixMinLen:24,qixTrail:12,qixTurn:1.6,twoQixFrom:3,
  sparxSpeed:100,superSpeed:150,sparxEvery:37,sparxMax:4,superAfter:74,maxMultiplier:9,
  lives:3,deathPause:1.6,levelDelay:2.2});
class SeededRandom{constructor(seed=1981){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const C=CONFIG,N=C.cols*C.rows,DX=[1,0,-1,0],DY=[0,1,0,-1],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const idx=(c,r)=>r*C.cols+c,col=i=>i%C.cols,row=i=>(i/C.cols)|0;
const px=i=>C.left+(col(i)+.5)*C.cell,py=i=>C.top+(row(i)+.5)*C.cell;
const interior=(C.cols-2)*(C.rows-2);
class QixEngine{
 constructor(seed=1981){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=C.lives;this.level=0;this.multiplier=1;this.claims=0;this.state='play';this.timer=0;this.newLevel();return this}
 // v: 0 open field, 1 the frame, 2 claimed fast, 3 claimed slow. stix marks the unfinished line; border the cells the marker may run on.
 newLevel(){this.level++;this.v=new Uint8Array(N);this.stix=new Uint8Array(N);this.border=new Uint8Array(N);
  for(let c=0;c<C.cols;c++){this.v[idx(c,0)]=1;this.v[idx(c,C.rows-1)]=1}for(let r=0;r<C.rows;r++){this.v[idx(0,r)]=1;this.v[idx(C.cols-1,r)]=1}
  this.claimed=0;this.percent=0;this.computeBorder();this.marker={c:idx(C.cols>>1,C.rows-1),prog:0};this.drawing=null;this.fuse=null;this.plan=null;
  const n=this.level>=C.twoQixFrom?2:1;this.qix=[...Array(n)].map((_,k)=>this.makeQix(C.left+C.cols*C.cell*(n===1?.5:k?.7:.3),C.top+C.rows*C.cell*.45));
  this.resetSparx();this.events.push({type:'level',level:this.level,qix:n})}
 makeQix(x,y){const q={a:{x:x-30,y},b:{x:x+30,y},trail:[],tick:0};for(const e of [q.a,q.b])this.steer(e);return q}
 qixSpeed(){return Math.min(C.qixMaxSpeed,C.qixSpeed+C.qixSpeedUp*(this.level-1))}
 steer(e){const a=this.rng.next()*Math.PI*2,s=this.qixSpeed();e.vx=Math.cos(a)*s;e.vy=Math.sin(a)*s}
 superAfter(){return C.superAfter}
 // Two Sparx at the top of the border, running opposite ways; if the marker is up there they start at the bottom instead.
 resetSparx(){this.levelClock=0;this.supers=false;this.nextSparx=C.sparxEvery;const m=this.marker.c,close=row(m)<40&&Math.abs(col(m)-(C.cols>>1))<60;
  const home=this.nearestRail(idx(C.cols>>1,close?C.rows-1:0));this.sparx=[this.makeSparx(home,0,1),this.makeSparx(home,2,-1)]}
 makeSparx(c,dir,hand){return{c,prev:c,dir,hand,prog:0,super:this.supers}}
 nb(i,d){const c=col(i)+DX[d],r=row(i)+DY[d];return c<0||r<0||c>=C.cols||r>=C.rows?-1:idx(c,r)}
 computeBorder(){const v=this.v,b=this.border;for(let i=0;i<N;i++){b[i]=0;if(!v[i])continue;const c=col(i),r=row(i);
   for(let dr=-1;dr<=1&&!b[i];dr++)for(let dc=-1;dc<=1;dc++){const cc=c+dc,rr=r+dr;if(cc>=0&&rr>=0&&cc<C.cols&&rr<C.rows&&!v[idx(cc,rr)]){b[i]=1;break}}}}
 // Nearest border cell to i, searching outwards through the grid.
 nearestRail(i){if(this.border[i])return i;const seen=new Uint8Array(N),q=[i];seen[i]=1;for(let h=0;h<q.length;h++){const x=q[h];if(this.border[x])return x;for(let d=0;d<4;d++){const n=this.nb(x,d);if(n>=0&&!seen[n]){seen[n]=1;q.push(n)}}}return i}
 // A drawing step may enter open field that touches no other part of the line, or reach claimed area to close the shape.
 canDraw(i,d){const n=this.nb(i,d);if(n<0||this.stix[n])return false;if(this.v[n])return !!this.border[n];
  for(let k=0;k<4;k++){const m=this.nb(n,k);if(m>=0&&m!==i&&this.stix[m])return false}return true}
 award(n){this.score+=n}
 dirs(input){const ax=clamp(Number(input.axis)||0,-1,1)||((input.right?1:0)-(input.left?1:0)),ay=clamp(Number(input.axisY)||0,-1,1)||((input.down?1:0)-(input.up?1:0));
  const h=Math.abs(ax)>.3?(ax>0?0:2):-1,v=Math.abs(ay)>.3?(ay>0?1:3):-1;return Math.abs(ax)>=Math.abs(ay)?[h,v].filter(d=>d>=0):[v,h].filter(d=>d>=0)}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  if(this.state==='dead'||this.state==='cleared'){this.timer-=dt;if(this.timer<=0){if(this.state==='cleared')this.newLevel();else this.respawn();this.state='play'}return}
  this.levelClock+=dt;
  // The level clock: more Sparx join, and when it runs out they all turn into Super Sparx.
  if(this.levelClock>=this.nextSparx){this.nextSparx+=C.sparxEvery;if(this.sparx.length<C.sparxMax){const home=this.nearestRail(idx(C.cols>>1,0));for(let k=this.sparx.length;k<Math.min(C.sparxMax,this.sparx.length+2);k++)this.sparx.push(this.makeSparx(home,k%2?2:0,k%2?-1:1));this.events.push({type:'sparx'})}}
  if(!this.supers&&this.levelClock>=this.superAfter()){this.supers=true;for(const s of this.sparx)s.super=true;this.events.push({type:'super'})}
  this.moveMarker(dt,input);if(this.state!=='play')return;
  this.moveFuse(dt);if(this.state!=='play')return;
  for(const q of this.qix)this.moveQix(q,dt);if(this.state!=='play')return;
  for(const s of this.sparx)this.moveSparx(s,dt);
  this.collide()}
 moveMarker(dt,input){const m=this.marker,D=this.drawing,fast=!!input.fast,slow=!!input.slow&&!fast,ds=this.dirs(input);let moved=false;
  if(D&&fast)D.slow=false;
  const speed=D?(fast?C.markerSpeed:slow?C.slowSpeed:0):C.markerSpeed;
  if(!ds.length||!speed)m.prog=0;else{m.prog+=speed/C.cell*dt;
   while(m.prog>=1){m.prog-=1;const d=ds.find(d=>this.canMove(d,fast||slow));if(d===undefined){m.prog=0;break}this.advance(d,fast,slow);moved=true;if(!this.drawing!==!D)break}}
  if(this.drawing){if(moved){this.drawing.idle=0;if(this.fuse){this.drawing.fuseK=this.fuse.k;this.fuse=null;this.events.push({type:'fuseOut'})}}else this.drawing.idle+=dt}}
 canMove(d,draw){const m=this.marker,n=this.nb(m.c,d);if(n<0)return false;if(this.drawing)return this.canDraw(m.c,d);if(this.border[n])return true;return draw&&!this.v[n]&&this.canDraw(m.c,d)}
 advance(d,fast,slow){const m=this.marker,n=this.nb(m.c,d);
  if(this.drawing){if(this.v[n]){m.c=n;this.close();return}this.stix[n]=1;this.drawing.cells.push(n);m.c=n;return}
  if(this.border[n]){m.c=n;return}
  this.drawing={start:m.c,cells:[n],slow:slow&&!fast,idle:0,fuseK:0};this.stix[n]=1;m.c=n;this.events.push({type:'draw',slow:this.drawing.slow})}
 // Closing a shape: the line becomes border; every open area without a Qix in it is claimed.
 close(){const D=this.drawing,v=this.v,fill=D.slow?3:2;for(const i of D.cells){this.stix[i]=0;v[i]=fill}
  const region=new Int8Array(N),seeds=this.qix.map(q=>this.qixCells(q).filter(i=>!v[i]));let regions=0;
  seeds.forEach(list=>{if(!list.some(i=>!region[i]))return;regions++;const id=regions,q=[...list.filter(i=>!region[i])];for(const i of q)region[i]=id;
   for(let h=0;h<q.length;h++){const x=q[h];for(let d=0;d<4;d++){const n=this.nb(x,d);if(n>=0&&!v[n]&&!region[n]){region[n]=id;q.push(n)}}}});
  let cells=D.cells.length;for(let i=0;i<N;i++)if(!v[i]&&!region[i]){v[i]=fill;cells++}
  this.claimed+=cells;this.percent=Math.floor(this.claimed*100/interior);this.claims++;
  // A shape scores 250 (500 slow) for every percent of the field it claims, fractions included.
  const pts=Math.round(cells*100/interior*(D.slow?C.points.slow:C.points.fast))*this.multiplier;this.award(pts);
  const mid=D.cells[D.cells.length>>1];this.events.push({type:'claim',points:pts,cells,slow:D.slow,percent:this.percent,share:cells*100/interior,x:px(mid),y:py(mid)});
  this.drawing=null;this.fuse=null;this.computeBorder();
  this.marker.c=this.nearestRail(this.marker.c);for(const s of this.sparx){s.c=this.nearestRail(s.c);s.prev=s.c}
  // Two Qix in two different areas: split. The level ends and the multiplier goes up.
  const split=this.qix.length>1&&regions>1;
  if(split){this.multiplier=Math.min(C.maxMultiplier,this.multiplier+1);this.events.push({type:'split',multiplier:this.multiplier})}
  if(split||this.percent>=C.threshold){const bonus=split?0:Math.max(0,this.percent-C.threshold)*C.bonusPerPercent;if(bonus)this.award(bonus);
   this.state='cleared';this.timer=C.levelDelay;this.events.push({type:'cleared',level:this.level,percent:this.percent,bonus,split})}}
 // Cells under the Qix's current line, sampled every few units.
 qixCells(q){const out=[],{a,b}=q,n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/3));for(let k=0;k<=n;k++){const i=this.cellAt(a.x+(b.x-a.x)*k/n,a.y+(b.y-a.y)*k/n);if(i>=0)out.push(i)}return out}
 cellAt(x,y){const c=Math.floor((x-C.left)/C.cell),r=Math.floor((y-C.top)/C.cell);return c<0||r<0||c>=C.cols||r>=C.rows?-1:idx(c,r)}
 open(x,y){const i=this.cellAt(x,y);return i>=0&&!this.v[i]}
 // The Qix: two end points bouncing around the open field, turning now and then, never crossing claimed area.
 moveQix(q,dt){const {a,b}=q;
  for(const e of [a,b]){if(this.rng.next()<dt*C.qixTurn)this.steer(e);
   let nx=e.x+e.vx*dt,ny=e.y+e.vy*dt;if(!this.open(nx,ny)){if(this.open(e.x-e.vx*dt,ny)){e.vx=-e.vx;nx=e.x+e.vx*dt}else if(this.open(nx,e.y-e.vy*dt)){e.vy=-e.vy;ny=e.y+e.vy*dt}else{e.vx=-e.vx;e.vy=-e.vy;nx=e.x;ny=e.y}}
   e.nx=nx;e.ny=ny}
  const ox=[a.x,a.y,b.x,b.y];a.x=a.nx;a.y=a.ny;b.x=b.nx;b.y=b.ny;
  // Keep the line between its shortest and longest length, pulling the ends together or apart.
  const len=Math.hypot(b.x-a.x,b.y-a.y);if(len>C.qixMaxLen||len<C.qixMinLen){const k=len>C.qixMaxLen?1:-1;for(const [e,o] of [[a,b],[b,a]]){e.vx+=(o.x-e.x)/(len||1)*40*k;e.vy+=(o.y-e.y)/(len||1)*40*k;const s=Math.hypot(e.vx,e.vy)||1,t=this.qixSpeed();e.vx*=t/s;e.vy*=t/s}}
  if(this.qixCells(q).some(i=>this.v[i])){[a.x,a.y,b.x,b.y]=ox;a.vx=-a.vx;a.vy=-a.vy;b.vx=-b.vx;b.vy=-b.vy}
  if(++q.tick%7===0){q.trail.push([a.x,a.y,b.x,b.y]);if(q.trail.length>C.qixTrail)q.trail.shift()}
  if(this.drawing&&this.qixCells(q).some(i=>this.stix[i]))this.die('qix')}
 // Sparx run along the border, keeping to one hand at a fork; Super Sparx take the way towards the marker and may run out along the line.
 moveSparx(s,dt){s.prog+=(s.super?C.superSpeed:C.sparxSpeed)/C.cell*dt;
  while(s.prog>=1){s.prog-=1;const rail=n=>n>=0&&(this.border[n]||s.super&&this.stix[n]);let best=-1;
   if(s.super){const m=this.marker.c,dist=n=>Math.abs(col(n)-col(m))+Math.abs(row(n)-row(m));let bd=1e9;for(let d=0;d<4;d++){if(d===(s.dir+2)%4)continue;const n=this.nb(s.c,d);if(rail(n)&&dist(n)<bd){bd=dist(n);best=d}}}
   else for(const t of [s.hand,0,-s.hand]){const d=(s.dir+t+4)%4;if(rail(this.nb(s.c,d))){best=d;break}}
   if(best<0){const d=(s.dir+2)%4;if(rail(this.nb(s.c,d)))best=d}
   if(best<0)break;s.dir=best;s.prev=s.c;s.c=this.nb(s.c,best)}}
 // Fuse: lights when the marker stops while drawing and burns along the line from its start towards the marker.
 moveFuse(dt){const D=this.drawing;if(!D)return;if(!this.fuse){if(D.idle>=C.fuseDelay){this.fuse={k:D.fuseK||0,prog:0};this.events.push({type:'fuse'})}return}
  const f=this.fuse;f.prog+=C.fuseSpeed/C.cell*dt;while(f.prog>=1){f.prog-=1;f.k++}if(f.k>=D.cells.length)this.die('fuse')}
 collide(){const m=this.marker.c,mc=col(m),mr=row(m);for(const s of this.sparx){const near=Math.max(Math.abs(col(s.c)-mc),Math.abs(row(s.c)-mr))<=1;
  if(s.c===m||s.prev===m||near&&(!this.drawing||s.super))return this.die('sparx')}}
 die(cause){if(this.state!=='play')return;this.lives--;this.events.push({type:'death',cause,x:px(this.marker.c),y:py(this.marker.c),lives:this.lives});
  if(this.lives<=0){this.state='end';this.events.push({type:'gameover',score:this.score})}else{this.state='dead';this.timer=C.deathPause}}
 // After a lost life the unfinished line is erased, the marker goes back to where it started and the Sparx start over.
 respawn(){const D=this.drawing;if(D){for(const i of D.cells)this.stix[i]=0;this.marker.c=D.start}this.drawing=null;this.fuse=null;this.marker.prog=0;this.plan=null;this.resetSparx()}
 // Demo pilot. It weighs box cuts into the field and runs along the border by first playing each one out on a copy of the
 // game, and keeps the one that claims the most without losing a life. It only ever sets the player's input.
 copy(){const o={},k=Object.create(QixEngine.prototype);for(const [n,v] of Object.entries(this))if(n!=='rng'&&n!=='events'&&typeof v!=='function')o[n]=v;
  Object.assign(k,structuredClone(o));k.rng=new SeededRandom(this.rng.value);k.events=[];return k}
 tryPlan(plan,pdir,limit){const k=this.copy(),s0=k.score;k.plan=plan&&{...plan,legs:plan.legs.map(l=>[...l])};k.pdir=pdir;let t=0,shut=-1;
  for(;t<limit;t+=C.step){k.step(C.step,k.follow());for(const v of k.events){if(v.type==='death')return{dead:true,t,pts:0};if(v.type==='claim'&&shut<0)shut=t}k.events.length=0;
   if(k.state!=='play'||shut>=0&&t>shut+.6)break}
  const m=k.marker.c,qd=Math.min(...k.qix.map(q=>Math.hypot((q.a.x+q.b.x)/2-px(m),(q.a.y+q.b.y)/2-py(m))/C.cell));return{dead:false,t,pts:k.score-s0,done:shut>=0||k.state==='cleared',qd}}
 // It plays like a good human, not a perfect one: now and then it looks only a short moment ahead (QixEngine.slip).
 // Its own luck runs apart from the game's dice, so it never changes the Qix or the Sparx.
 luck(){let t=this.aiLuck=((this.aiLuck??Math.imul(this.rng.value,0x9e3779b1))+0x6d2b79f5)>>>0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}
 pilot(){if(this.state!=='play')return{};if(!(this.aiNext>this.clock&&this.aiNext-this.clock<1)){this.aiNext=this.clock+.2;this.think(QixEngine.lookAhead*(this.luck()<QixEngine.slip?QixEngine.glance:1))}return this.follow()}
 think(H=QixEngine.lookAhead){const m=this.marker,D=this.drawing,back=d=>(d+2)%4;let best=null;const pick=(plan,pdir,r,val)=>{if(!best||val>best.val)best={plan,pdir,val}};
  const score=r=>r.dead?-1e6+r.t:0;
  if(D){if(!this.tryPlan(this.plan,this.pdir,H).dead){this.aiAlarm=null;return}
   // A human sees the danger a moment late (QixEngine.react), later as the levels get busier.
   if(this.aiAlarm==null){this.aiAlarm=this.clock+QixEngine.react*(1+this.level)/2*(.5+this.luck());return}if(this.clock<this.aiAlarm)return;this.aiAlarm=null;
   // The line is in danger: try short ways back to the border.
   for(let d=0;d<4;d++){if(!this.canDraw(m.c,d))continue;for(const n of [1,3,8])for(const e of [0,1,3]){const b=(d+e)%4;const plan={legs:[[d,n],[b,1e9]],k:0,from:m.c,slow:false,start:D.start};const r=this.tryPlan(plan,this.pdir,H);pick(plan,this.pdir,r,r.dead?score(r):1e3-r.t)}}
   if(best){this.plan=best.plan}return}
  // After each shape it takes a breath on the border before the next cut (QixEngine.rest).
  if(this.aiClaims!==this.claims){this.aiClaims=this.claims;this.aiRest=this.clock+QixEngine.rest*(.5+this.luck())}
  if(this.aiRest>this.clock&&this.aiRest-this.clock<5){const r=this.runBorder();if(r.val>-1e5){this.plan=null;this.pdir=r.pdir;return}}
  const ins=[0,1,2,3].filter(d=>{const n=this.nb(m.c,d);return n>=0&&!this.v[n]}),t=Math.floor(this.clock*5.3);
  for(const d1 of ins)for(const side of [(d1+1)%4,(d1+3)%4])for(const dep of [8,18,32])for(const wid of [16,40,72]){
   const slow=!this.supers&&(t+dep+wid)%5===0,plan={legs:[[d1,dep],[side,wid],[back(d1),1e9]],k:0,from:m.c,slow};const r=this.tryPlan(plan,-1,H);
   if(!r.dead&&(!r.done||r.pts>0))pick(plan,-1,r,1e4+(r.done?r.pts/(r.t+.8):.6*dep*wid/((2*dep+wid)*C.cell/C.markerSpeed+.8))*(slow?1.1:1))}
  if(best&&best.val>=1e4){this.plan=best.plan;return}
  // No safe cut: run (or wait) on the border, towards where the Qix is far away.
  this.plan=null;this.pdir=this.runBorder().pdir}
 runBorder(){const m=this.marker;let best=null;for(const d of [-1,0,1,2,3]){if(d>=0&&!this.border[this.nb(m.c,d)])continue;const r=this.tryPlan(null,d,1.4),val=r.dead?-1e6+r.t:r.qd+(d===this.pdir?3:0);if(!best||val>best.val)best={pdir:d,val}}return best}
 // Follows the chosen plan: the legs of a box cut, or a run along the border.
 follow(){const m=this.marker,D=this.drawing,P=this.plan,go=(d,slow)=>({axis:DX[d],axisY:DY[d],fast:!slow,slow:!!slow});
  if(!D){if(P&&!P.start){const d=P.legs[0][0];if(this.canMove(d,true))return go(d,P.slow)}this.plan=null;
   if(this.pdir===undefined||this.pdir<0)return{};const rails=[0,1,2,3].filter(d=>{const n=this.nb(m.c,d);return n>=0&&this.border[n]});if(!rails.length)return{};
   if(!rails.includes(this.pdir))this.pdir=rails.find(d=>d!==(this.pdir+2)%4)??rails[0];return{axis:DX[this.pdir],axisY:DY[this.pdir]}}
  const Q=P||(this.plan={legs:[[0,1e9]],k:0,from:m.c,slow:false});if(!Q.start)Q.start=D.start;let leg=Q.legs[Q.k];
  if(Q.k<Q.legs.length-1&&Math.abs(col(m.c)-col(Q.from))+Math.abs(row(m.c)-row(Q.from))>=leg[1]){Q.k++;Q.from=m.c;leg=Q.legs[Q.k]}
  const order=[leg[0],...Q.legs.slice(Q.k).map(l=>l[0]),0,1,2,3];const d=order.find(d=>this.canDraw(m.c,d));return d===undefined?{fast:true}:go(d,Q.slow)}
 snapshot(){return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,lives:this.lives,level:this.level,percent:this.percent,claimed:this.claimed,multiplier:this.multiplier,
  marker:this.marker.c,drawing:this.drawing?this.drawing.cells.length:0,fuse:this.fuse?this.fuse.k:-1,sparx:this.sparx.map(s=>[s.c,s.super?1:0]),qix:this.qix.map(q=>[q.a.x,q.a.y,q.b.x,q.b.y].map(n=>+n.toFixed(2)))}}
}
QixEngine.lookAhead=1.2;QixEngine.slip=.05;QixEngine.glance=.2;QixEngine.react=.1;QixEngine.rest=2.5;
const QuizCore={CONFIG,QixEngine,SeededRandom,idx,col,row,px,py,DX,DY};
g.QuizCore=QuizCore;if(typeof module!=='undefined')module.exports=QuizCore;
})(globalThis);
