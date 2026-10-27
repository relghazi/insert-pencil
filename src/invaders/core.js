'use strict';
/* Space Substitutes: Taito Space Invaders (1978) rules, drawn as substitute teachers marching on a classroom.
   Rules follow the original cabinet: 5 rows of 11 invaders (top row 30 points, the next two 20, the bottom two 10);
   the formation steps sideways and drops a row at either edge; it marches faster as fewer remain (one step per
   remaining invader), so the last one races; the player has one shot on screen at a time; the invaders have at most
   three shots, one of them aimed at the player's column; four shields erode where shots and invaders touch them and are rebuilt for each wave;
   a mystery ship crosses the top while eight or more invaders remain, worth 50 to 300 by the cabinet's shot-count
   table (the 23rd shot and every 15th after score 300); an extra life at 1,500; three lives; if the invaders reach
   the player's row the game is over; each new wave starts lower.
   Cabinet timing (checked 2026-10-31 against the Computer Archeology disassembly of the 1978 ROM): the rack steps
   2 pixels (3 rightward for the last invader) and drops 8, turning at the playfield edges with about two columns of
   slack; waves 2 to 9 start 3, 5, 6, 6, 6, 7, 7 and 7 drops lower (the 10th starts over at 3) and the invaders land
   11 drops below the first wave's start; the player moves 1 pixel and the player shot 4 pixels a frame; the three
   invader shots (rolling, plunger, squiggly) each move 4 pixels every third frame (5 when eight or fewer invaders
   remain) and take turns to fire; the rolling shot falls from the column above the player, the plunger and squiggly
   shots from the cabinet's column tables (the plunger stops when one invader is left, the squiggly waits while the
   mystery ship flies); a new shot may only drop once every other shot on screen has gone further than the reload
   rate, 48 steps under 300 points, then 16, 11, 8 and 7 steps (under 1,100, 2,100, 3,100, above), so early on only
   one shot falls at a time; the mystery ship is due every 1,536 frames once the rack has dropped and moves 2 pixels
   every third frame.
   Adaptations (not ROM-exact): landscape 4:3 court scaled from the cabinet (about 3x vertically, 4.6x across); the
   formation moves as one block rather than one invader per frame (same tempo: one step per remaining invader at 60
   steps a second); no march pause while an invader explodes. */
(function(g){
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['axis','n',-1,1,20],['fire','b']],
  cols:11,rows:5,cellW:64,cellH:52,invW:46,invH:38,startY:100,
  // Drops below the first wave's start for waves 1 to 9 (the 10th starts over at the second entry); landing is 11 drops.
  waveDrop:Object.freeze([0,3,5,6,6,6,7,7,7]),landDrops:11,
  edge:40,rackEdge:105,stepX:8,dropY:26,stepTick:1/60,
  rowPoints:Object.freeze([30,20,20,10,10]),
  playerY:700,playerW:56,playerH:40,playerSpeed:330,shotSpeed:720,shotH:18,
  // Invader shots: 4 cabinet pixels every third frame (5 with eight or fewer invaders), 20 shot steps a second.
  bombSpeed:240,bombFast:300,bombFastAt:8,bombMax:3,bombH:18,bombStepRate:20,
  // Reload rate in shot steps by score (under 300, 1,100, 2,100, 3,100, above) and the column tables (1-11).
  reload:Object.freeze([[300,48],[1100,16],[2100,11],[3100,8],[Infinity,7]].map(Object.freeze)),fireDelay:.8,
  plungerCols:Object.freeze([1,7,1,1,1,4,11,1,6,3,1,1,11,9,2,8]),squigglyCols:Object.freeze([11,1,6,3,1,1,11,9,2,8,2,11,4,7,10]),
  shields:4,shieldY:570,shieldW:120,shieldH:76,shieldCell:4,
  ufoY:72,ufoW:60,ufoSpeed:184,ufoEvery:1536/60,ufoMinInvaders:8,
  ufoTable:Object.freeze([100,50,50,100,150,100,100,50,300,100,100,100,50,150,100]),
  lives:3,extraAt:1500,deathPause:2,waveDelay:2});
class SeededRandom{constructor(seed=1978){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const W=CONFIG.width,H=CONFIG.height,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
class InvadersEngine{
 constructor(seed=1978){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=CONFIG.lives;this.extraGiven=false;this.wave=0;this.shots=0;this.fireHeld=false;this.frameAcc=0;this.frameN=0;this.plungerI=0;this.squigglyI=0;
  this.player={x:W/2};this.shot=null;this.bombs=[];this.ufo=null;this.ufoTimer=CONFIG.ufoEvery;this.state='play';this.timer=0;this.newWave();return this}
 // Each new wave brings fresh shields, as on the cabinet.
 newWave(){this.wave++;this.buildShields();const T=CONFIG.waveDrop,drop=T[this.wave<=T.length?this.wave-1:1+(this.wave-2)%(T.length-1)]*CONFIG.dropY;this.invaders=[];
  const left=(W-CONFIG.cols*CONFIG.cellW)/2;for(let r=0;r<CONFIG.rows;r++)for(let c=0;c<CONFIG.cols;c++)this.invaders.push({row:r,col:c,x:left+c*CONFIG.cellW+(CONFIG.cellW-CONFIG.invW)/2,y:CONFIG.startY+drop+r*CONFIG.cellH,alive:true,points:CONFIG.rowPoints[r]});
  this.dir=1;this.tick=0;this.frame=0;this.marchClock=0;this.dropped=false;this.bombs=[];this.shot=null;this.fireDelay=CONFIG.fireDelay;this.events.push({type:'wave',wave:this.wave})}
 buildShields(){const gap=(W-CONFIG.shields*CONFIG.shieldW)/(CONFIG.shields+1),n=CONFIG.shieldW/CONFIG.shieldCell,m=CONFIG.shieldH/CONFIG.shieldCell;this.shields=[];
  for(let i=0;i<CONFIG.shields;i++){const cells=[];for(let y=0;y<m;y++)for(let x=0;x<n;x++){const arch=y>m*.62&&x>n*.3&&x<n*.7;cells.push(!arch)}this.shields.push({x:gap+i*(CONFIG.shieldW+gap),y:CONFIG.shieldY,cells,n,m})}}
 alive(){return this.invaders.filter(v=>v.alive)}
 // The march tempo: one step for every invader still standing, at 60 steps a second.
 stepInterval(){return Math.max(1,this.alive().length)*CONFIG.stepTick}
 march(){const live=this.alive();if(!live.length)return;const minX=Math.min(...live.map(v=>v.x)),maxX=Math.max(...live.map(v=>v.x+CONFIG.invW));
  const last=live.length===1,dx=CONFIG.stepX*(last&&this.dir>0?1.5:1)*this.dir;
  if((this.dir>0&&maxX+dx>W-CONFIG.rackEdge)||(this.dir<0&&minX+dx<CONFIG.rackEdge)){for(const v of live)v.y+=CONFIG.dropY;this.dir*=-1;this.dropped=true}else for(const v of live)v.x+=dx;
  this.frame^=1;this.events.push({type:'march',note:this.tick++%4});
  for(const v of live){this.erodeRect({x:v.x,y:v.y,w:CONFIG.invW,h:CONFIG.invH});if(v.y+CONFIG.invH>=this.landY()){this.state='end';this.events.push({type:'gameover',score:this.score,landed:true});return}}}
 // The invaders land 11 drops below where the first wave's bottom row starts, as on the cabinet.
 landY(){return CONFIG.startY+(CONFIG.rows-1)*CONFIG.cellH+CONFIG.invH+CONFIG.landDrops*CONFIG.dropY-2}
 shieldCellsHit(rect){const out=[];for(const s of this.shields){if(!overlap(rect,{x:s.x,y:s.y,w:CONFIG.shieldW,h:CONFIG.shieldH}))continue;const c=CONFIG.shieldCell;
   for(let y=0;y<s.m;y++)for(let x=0;x<s.n;x++){const i=y*s.n+x;if(s.cells[i]&&overlap(rect,{x:s.x+x*c,y:s.y+y*c,w:c,h:c}))out.push([s,x,y])}}return out}
 erodeRect(rect){for(const [s,x,y] of this.shieldCellsHit(rect))s.cells[y*s.n+x]=false}
 // A shot that touches a shield blasts a small round hole around the first cell it meets.
 blast(s,cx,cy,r=3){for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++){if(x<0||y<0||x>=s.n||y>=s.m)continue;if((x-cx)**2+(y-cy)**2<=r*r+1&&this.rng.next()<.8)s.cells[y*s.n+x]=false}}
 fire(){if(this.shot||this.state!=='play')return;this.shot={x:this.player.x,y:CONFIG.playerY-CONFIG.playerH/2};this.shots++;this.events.push({type:'shot'})}
 reloadRate(){return CONFIG.reload.find(r=>this.score<r[0])[1]}
 // One cabinet frame: the three invader shots take turns (rolling, plunger, squiggly), one a frame.
 cabinetFrame(){const kind=this.frameN++%3;if(this.fireDelay>0||this.bombs.length>=CONFIG.bombMax||this.bombs.some(b=>b.kind===kind))return;
  // Too soon while any other shot on screen has not gone further than the reload rate (a shot takes its first step as it drops).
  const rate=this.reloadRate();if(this.bombs.some(b=>{const n=1+Math.floor(b.age*CONFIG.bombStepRate);return n<=rate}))return;
  this.dropBomb(kind)}
 // kind 0: the rolling shot, from the column above the player; 1: plunger, 2: squiggly, from the column tables.
 dropBomb(kind=0){const live=this.alive();if(!live.length||this.bombs.length>=CONFIG.bombMax)return false;let col;
  if(kind===0){const near=live.reduce((a,v)=>Math.abs(v.x+CONFIG.invW/2-this.player.x)<Math.abs(a.x+CONFIG.invW/2-this.player.x)?v:a);col=near.col}
  else if(kind===1){if(live.length===1)return false;const T=CONFIG.plungerCols;col=T[this.plungerI++%T.length]-1}
  else{if(this.ufo)return false;const T=CONFIG.squigglyCols;col=T[this.squigglyI++%T.length]-1}
  const inCol=live.filter(v=>v.col===col);if(!inCol.length)return false;
  const low=inCol.reduce((a,v)=>v.y>a.y?v:a);this.bombs.push({x:low.x+CONFIG.invW/2,y:low.y+CONFIG.invH,kind,age:0});this.events.push({type:'bomb'});return true}
 award(n){this.score+=n;if(!this.extraGiven&&this.score>=CONFIG.extraAt){this.extraGiven=true;this.lives++;this.events.push({type:'extra'})}}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  if(this.state==='dead'||this.state==='cleared'){this.timer-=dt;if(this.timer<=0){if(this.state==='cleared')this.newWave();else{this.player.x=W/2;this.bombs=[]}this.state='play'}return}
  const p=this.player,axis=clamp(Number(input.axis)||0,-1,1),dir=axis||((input.right?1:0)-(input.left?1:0));p.x=clamp(p.x+dir*CONFIG.playerSpeed*dt,CONFIG.edge,W-CONFIG.edge);
  if(input.fire&&!this.fireHeld)this.fire();this.fireHeld=!!input.fire;
  this.marchClock+=dt;while(this.marchClock>=this.stepInterval()&&this.state==='play'){this.marchClock-=this.stepInterval();this.march()}if(this.state!=='play')return;
  if(this.fireDelay>0)this.fireDelay-=dt;this.frameAcc+=dt*60;while(this.frameAcc>=1-1e-9){this.frameAcc-=1;this.cabinetFrame()}
  this.moveShot(dt);this.moveBombs(dt);this.moveUfo(dt);
  if(this.state==='play'&&!this.alive().length){this.state='cleared';this.bombs=[];this.shot=null;this.timer=CONFIG.waveDelay;this.events.push({type:'cleared',wave:this.wave})}}
 moveShot(dt){const s=this.shot;if(!s)return;s.y-=CONFIG.shotSpeed*dt;const r={x:s.x-2,y:s.y,w:4,h:CONFIG.shotH};
  if(s.y+CONFIG.shotH<40){this.shot=null;return}
  const hit=this.shieldCellsHit(r)[0];if(hit){this.blast(hit[0],hit[1],hit[2]);this.shot=null;return}
  for(const v of this.alive())if(overlap(r,{x:v.x,y:v.y,w:CONFIG.invW,h:CONFIG.invH})){v.alive=false;this.award(v.points);this.shot=null;this.events.push({type:'kill',points:v.points,row:v.row,x:v.x+CONFIG.invW/2,y:v.y+CONFIG.invH/2});return}
  if(this.ufo&&overlap(r,{x:this.ufo.x-CONFIG.ufoW/2,y:CONFIG.ufoY-14,w:CONFIG.ufoW,h:28})){const pts=CONFIG.ufoTable[this.shots%15];this.award(pts);this.events.push({type:'ufo-hit',points:pts,x:this.ufo.x});this.ufo=null;this.shot=null;return}
  for(const b of this.bombs)if(Math.abs(b.x-s.x)<6&&Math.abs(b.y-s.y)<CONFIG.shotH){b.dead=true;this.shot=null;this.events.push({type:'cancel'});break}this.bombs=this.bombs.filter(b=>!b.dead)}
 moveBombs(dt){const p=this.player,v=this.alive().length<=CONFIG.bombFastAt?CONFIG.bombFast:CONFIG.bombSpeed;for(const b of this.bombs){b.y+=v*dt;b.age+=dt;const r={x:b.x-3,y:b.y,w:6,h:CONFIG.bombH};
   const hit=this.shieldCellsHit(r)[0];if(hit){this.blast(hit[0],hit[1],hit[2],2);b.dead=true;continue}
   if(overlap(r,{x:p.x-CONFIG.playerW/2,y:CONFIG.playerY-CONFIG.playerH/2,w:CONFIG.playerW,h:CONFIG.playerH})){b.dead=true;this.hitPlayer();return}
   if(b.y>H-20)b.dead=true}this.bombs=this.bombs.filter(b=>!b.dead)}
 hitPlayer(){this.lives--;this.shot=null;this.bombs=[];this.events.push({type:'death',x:this.player.x,lives:this.lives});if(this.lives<=0){this.state='end';this.events.push({type:'gameover',score:this.score,landed:false})}else{this.state='dead';this.timer=CONFIG.deathPause;this.fireDelay=CONFIG.fireDelay}}
 moveUfo(dt){if(this.ufo){this.ufo.x+=this.ufo.dir*CONFIG.ufoSpeed*dt;if(this.ufo.x<-CONFIG.ufoW||this.ufo.x>W+CONFIG.ufoW)this.ufo=null;return}
  if(!this.dropped)return;this.ufoTimer-=dt;if(this.ufoTimer<=0){this.ufoTimer=CONFIG.ufoEvery;if(this.alive().length>=CONFIG.ufoMinInvaders){const dir=this.shots%2?-1:1;this.ufo={x:dir>0?-CONFIG.ufoW/2:W+CONFIG.ufoW/2,dir};this.events.push({type:'ufo'})}}}
 // Demo pilot: slides under the lowest invader and fires, steering clear of falling chalk.
 pilot(){const live=this.alive();if(!live.length)return{};const target=live.reduce((a,v)=>v.y>a.y||(v.y===a.y&&Math.abs(v.x-this.player.x)<Math.abs(a.x-this.player.x))?v:a);
  // Lead the target by the march it makes while the shot climbs (the last invader races).
  const t=(CONFIG.playerY-target.y)/CONFIG.shotSpeed,lead=Math.floor(t/this.stepInterval())*CONFIG.stepX*(live.length===1&&this.dir>0?1.5:1)*this.dir;
  let x=clamp(target.x+CONFIG.invW/2+lead,CONFIG.rackEdge,W-CONFIG.rackEdge);const danger=this.bombs.find(b=>b.y>CONFIG.playerY-220&&Math.abs(b.x-this.player.x)<40);if(danger)x=this.player.x+(danger.x<this.player.x?80:-80);
  const d=x-this.player.x;return{axis:Math.abs(d)<4?0:clamp(d/30,-1,1),fire:!this.shot&&Math.abs(d)<(live.length<=4?10:20)&&Math.floor(this.clock*8)%2===0}}
 snapshot(){return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,lives:this.lives,wave:this.wave,shots:this.shots,player:{...this.player},alive:this.alive().length,
  invaders:this.alive().map(v=>[v.col,v.row,Math.round(v.x),Math.round(v.y)]),bombs:this.bombs.length,ufo:this.ufo?Math.round(this.ufo.x):null,shield:this.shields.map(s=>s.cells.filter(Boolean).length)}}
}
const SpaceSubstitutesCore={CONFIG,InvadersEngine,SeededRandom};
g.SpaceSubstitutesCore=SpaceSubstitutesCore;if(typeof module!=='undefined')module.exports=SpaceSubstitutesCore;
})(globalThis);
