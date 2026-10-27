'use strict';
/* Dig Doug: Namco Dig Dug (1982) rules, drawn as Doug digging under the football field past goggled moles and the
   green mascot dragon. Rules follow the original cabinet: a field of dirt in four depth strata under the surface; the
   player digs a tunnel wherever he walks and turns only on the tile grid; Pookas and Fygars start in their own short
   tunnels and walk only through dug tunnels, but now and then turn into ghost eyes that float through the dirt
   towards the player and take shape again in a tunnel; a Fygar stops, flashes and breathes fire straight ahead
   horizontally, through dirt; the pump's hose shoots along tunnels (never through dirt) and catches the first enemy it
   reaches, which freezes; four pumps pop it, and left alone it shrinks back one stage at a time; a popped enemy scores
   by the stratum it is in (200, 300, 400, 500 from the top), a Fygar popped with a horizontal hose doubles; touching
   an inflated enemy is safe; rocks sit in the dirt and, once the dirt under them is dug, wobble and drop (but wait
   while the player stands right under them), falling until they meet dirt; enemies under a falling rock are carried
   down and crushed for 1,000, 2,500, 4,000, 6,000, 8,000, 10,000, 12,000 or 15,000 for 1 to 8 at once, and it kills
   the player too; once two rocks have dropped a bonus vegetable appears in the centre (carrot 400, turnip 600,
   mushroom 800, cucumber 1,000, eggplant 2,000, green pepper 3,000, tomato 4,000, onion 5,000, watermelon 6,000,
   Galaxian flagship 7,000, pineapple 8,000 by round); when one enemy is left it runs for the top left corner of the
   surface and escapes off the left edge; clearing the field starts the next round with more enemies (round flowers on
   the surface: a big one for ten, a small one for each round); digging new tunnel 10 a tile; three lives, extra
   lives at 10,000, 40,000 and every 40,000 after (Atari's suggested setting, operator manual TM-203, checked
   2026-10-26 with its point table); after a
   lost life the enemies return to where they started.
   Adaptations (not ROM-exact): the field is 14 by 13 tiles (one surface row and four strata of three rows) on the 4:3
   page; tunnels are dug in quarter tiles; the round starts with Doug in the middle at the foot of the shaft;
   enemy counts, speeds, ghost and fire timings tuned by eye at 120 Hz; the Galaxian flagship is her space bug. */
(function(g){
const CONFIG=Object.freeze({version:'0.1.0',width:1024,height:768,step:1/120,record:[['axis','n',-1,1,20],['axisY','n',-1,1,20],['fire','b']],
  cell:52,cols:14,rows:13,left:148,top:84,sub:4,startC:6,startR:6,
  playerSpeed:3,enemySpeed:1.8,ghostSpeed:1.3,hoseSpeed:14,hoseRange:3,pumpEvery:.3,deflateAfter:.6,deflateEvery:.5,popTime:.35,
  ghostDelay:Object.freeze([6,13]),fireDelay:Object.freeze([3,7]),fireCharge:.7,fireTime:.6,fireRange:3,
  rockWobble:.9,rockSpeed:6,rockBreak:.6,veggieTime:10,
  depthPoints:Object.freeze([200,300,400,500]),digPoints:10,crushPoints:Object.freeze([1000,2500,4000,6000,8000,10000,12000,15000]),
  veggies:Object.freeze([[1,'carrot',400],[2,'turnip',600],[3,'mushroom',800],[5,'cucumber',1000],[7,'eggplant',2000],[9,'pepper',3000],[11,'tomato',4000],[13,'onion',5000],[15,'watermelon',6000],[17,'bug',7000],[1e9,'pineapple',8000]]),
  lives:3,extraAt:Object.freeze([10000,40000]),extraEvery:40000,deathPause:2,roundDelay:1.5});
class SeededRandom{constructor(seed=1982){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const C=CONFIG,S=C.sub,FW=(C.cols-1)*S+1,FH=(C.rows-1)*S+1,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),on=v=>Math.abs(v-Math.round(v))<1e-6;
const px=x=>C.left+(x+.5)*C.cell,py=y=>C.top+(y+.5)*C.cell,DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
// Stratum of a row: the surface and rows 1 to 3 are the first, then three rows each.
const stratum=y=>clamp(Math.floor((Math.round(y)-1)/3),0,3);
class DigDugEngine{
 constructor(seed=1982){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=C.lives;this.extras=0;this.dugNew=0;this.round=0;this.pumps=0;this.prevFire=false;this.flip=false;this.stuck=0;this.detour=null;this.newRound();return this}
 between([a,b]){return a+(b-a)*this.rng.next()}
 dug(fx,fy){return fx>=0&&fy>=0&&fx<FW&&fy<FH&&this.field[fy*FW+fx]===1}
 dig(fx,fy){if(fx>=0&&fy>=0&&fx<FW&&fy<FH&&!this.field[fy*FW+fx]){this.field[fy*FW+fx]=1;this.digs++;return true}return false}
 digLine(c0,r0,c1,r1){for(let fx=Math.min(c0,c1)*S;fx<=Math.max(c0,c1)*S;fx++)for(let fy=Math.min(r0,r1)*S;fy<=Math.max(r0,r1)*S;fy++)this.dig(fx,fy)}
 cellDug(c,r){return this.dug(c*S,r*S)}
 rockAt(c,r){return this.rocks.find(k=>k.c===c&&k.r===r&&(k.state==='still'||k.state==='wobble'))}
 // A walker may step from one tile centre to the next only through a fully dug tunnel, never into a rock.
 open(c,r,dx,dy){const nc=c+dx,nr=r+dy;if(nc<0||nc>=C.cols||nr<0||nr>=C.rows||this.rockAt(nc,nr))return false;for(let k=1;k<=S;k++)if(!this.dug(c*S+dx*k,r*S+dy*k))return false;return true}
 // Round n: 4 to 8 enemies (a third of them Fygars) in their own three-tile tunnels, rocks in solid dirt.
 newRound(){this.round++;this.field=new Uint8Array(FW*FH);this.digs=0;for(let fx=0;fx<FW;fx++)this.dig(fx,0);
  this.digLine(C.startC,0,C.startC,C.startR);const used=new Set(),key=(c,r)=>c+','+r,free=(c,r)=>!used.has(key(c,r));
  for(let r=0;r<=C.startR+1;r++)for(let c=C.startC-1;c<=C.startC+1;c++)used.add(key(c,r));
  const n=Math.min(8,3+Math.ceil(this.round/2)),fygars=Math.floor((n+1)/3);this.enemies=[];
  for(let i=0,tries=0;i<n&&tries<2000;tries++){const horiz=this.rng.next()<.5,c=1+Math.floor(this.rng.next()*(C.cols-2)),r=2+Math.floor(this.rng.next()*(C.rows-3));
   const cells=horiz?[[c-1,r],[c,r],[c+1,r]]:[[c,r-1],[c,r],[c,r+1]];if(cells.some(([a,b])=>b<2||b>=C.rows||a<0||a>=C.cols))continue;
   if(!cells.every(([a,b])=>[-1,0,1].every(i2=>[-1,0,1].every(j=>free(a+i2,b+j)))))continue;
   for(const [a,b] of cells)used.add(key(a,b));const [a0,b0]=cells[0],[a1,b1]=cells[2];this.digLine(a0,b0,a1,b1);
   this.enemies.push(this.enemy(i<fygars?'fygar':'pooka',c,r));i++}
  const rocks=3+(this.round>=5)+(this.round>=10);this.rocks=[];
  for(let i=0,tries=0;i<rocks&&tries<2000;tries++){const c=Math.floor(this.rng.next()*C.cols),r=1+Math.floor(this.rng.next()*(C.rows-4));
   if(!free(c,r)||!free(c,r+1)||this.cellDug(c,r)||this.cellDug(c,r+1)||this.rocks.some(k=>Math.abs(k.c-c)<2&&Math.abs(k.r-r)<2))continue;
   used.add(key(c,r));this.rocks.push({c,r,y:r,state:'still',t:0,caught:[]});i++}
  this.rocksDropped=0;this.veggie=null;this.veggieShown=false;this.respawn();this.state='play';this.events.push({type:'round',round:this.round})}
 enemy(kind,c,r){return{id:this.enemies.length,kind,home:{x:c,y:r},x:c,y:r,tx:c,ty:r,dir:{dx:1,dy:0},ghost:false,ghostT:0,ghostTimer:this.between(C.ghostDelay),fire:null,fireTimer:this.between(C.fireDelay),pump:0,deflate:0,dying:0,flat:false,crushed:null,flee:false}}
 respawn(){this.player={x:C.startC,y:C.startR,dir:{dx:1,dy:0},moving:false,crushed:null};this.hose=null;this.pumpTimer=0;
  for(const e of this.enemies)if(!e.dying)Object.assign(e,{x:e.home.x,y:e.home.y,tx:e.home.x,ty:e.home.y,ghost:false,fire:null,pump:0,crushed:null,ghostTimer:this.between(C.ghostDelay),fireTimer:this.between(C.fireDelay)});
  this.rocks=this.rocks.filter(k=>k.state==='still'||k.state==='wobble')}
 // Score of the k-th extra life (0-based): 10,000, 40,000, then every 40,000.
 extraScore(k){return k<C.extraAt.length?C.extraAt[k]:C.extraAt[C.extraAt.length-1]+C.extraEvery*(k-C.extraAt.length+1)}
 award(n){this.score+=n;while(this.score>=this.extraScore(this.extras)){this.extras++;this.lives++;this.events.push({type:'extra'})}}
 alive(){return this.enemies.filter(e=>!e.dying&&!e.crushed)}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  if(this.state==='dead'||this.state==='cleared'){this.timer-=dt;if(this.timer<=0){if(this.state==='cleared')this.newRound();else{this.respawn();this.state='play'}}return}
  const fire=!!input.fire,edge=fire&&!this.prevFire;this.prevFire=fire;
  this.moveHose(dt,input,fire,edge);this.moveRocks(dt);
  for(const e of this.enemies)this.moveEnemy(e,dt);
  this.enemies=this.enemies.filter(e=>!(e.dying&&(e.dying-=dt)<=0)&&!e.gone);
  if(this.state!=='play')return;
  // The last enemy runs for the top left corner of the surface.
  const left=this.alive();if(left.length===1&&!left[0].flee&&!left[0].pump){left[0].flee=true;this.events.push({type:'flee'})}
  if(this.rocksDropped>=2&&!this.veggieShown){const v=C.veggies.find(([upto])=>this.round<=upto);this.veggie={x:C.startC,y:C.startR,t:C.veggieTime,kind:v[1],points:v[2]};this.veggieShown=true;this.events.push({type:'veggie',kind:v[1]})}
  if(this.veggie){const v=this.veggie,p=this.player;v.t-=dt;if(Math.hypot(p.x-v.x,p.y-v.y)<.6){this.award(v.points);this.events.push({type:'bonus',kind:v.kind,points:v.points,x:px(v.x),y:py(v.y)});this.veggie=null}else if(v.t<=0)this.veggie=null}
  this.collide();
  if(this.state==='play'&&!this.enemies.length){this.state='cleared';this.timer=C.roundDelay;this.hose=null;this.events.push({type:'cleared',round:this.round})}}
 // The player walks on the tile grid: a turn waits until he reaches the next tile centre.
 movePlayer(dt,input){const p=this.player,ax=clamp(Number(input.axis)||0,-1,1),ay=clamp(Number(input.axisY)||0,-1,1);
  let h=Math.abs(ax)>.3?Math.sign(ax):0,v=Math.abs(ay)>.3?Math.sign(ay):0;
  if(h&&v){if(Math.abs(Math.abs(ax)-Math.abs(ay))>.2){if(Math.abs(ax)>Math.abs(ay))v=0;else h=0}else if(p.dir.dx)h=0;else v=0}
  p.moving=false;if(!h&&!v)return;const d=C.playerSpeed*dt;
  if(h){if(on(p.y)){p.y=Math.round(p.y);this.slide('x',h,d)}else this.align('y',d)}
  else{if(on(p.x)){p.x=Math.round(p.x);this.slide('y',v,d)}else this.align('x',d)}
  // Digging new tunnel: 10 for every tile's length of fresh dirt.
  if(this.dig(Math.round(p.x*S),Math.round(p.y*S))&&++this.dugNew>=S){this.dugNew=0;this.award(C.digPoints)}}
 slide(axis,s,d){const p=this.player,max=axis==='x'?C.cols-1:C.rows-1;let n=clamp(p[axis]+s*d,0,max);
  for(const k of this.rocks){if(k.state!=='still'&&k.state!=='wobble')continue;const along=axis==='x'?k.c:k.r,across=axis==='x'?k.r-p.y:k.c-p.x;
   if(Math.abs(across)<1&&Math.sign(along-p[axis])===s)n=s>0?Math.min(n,Math.max(p[axis],along-1)):Math.max(n,Math.min(p[axis],along+1))}
  p.moving=n!==p[axis];p[axis]=n;p.dir=axis==='x'?{dx:s,dy:0}:{dx:0,dy:s}}
 align(axis,d){const p=this.player,s=(axis==='x'?p.dir.dx:p.dir.dy)||1,t=s>0?Math.ceil(p[axis]):Math.floor(p[axis]);p[axis]=s>0?Math.min(t,p[axis]+d):Math.max(t,p[axis]-d);p.moving=true}
 // Hose: shoots along the tunnel the way he faces, stops at dirt, catches the first enemy; each pump inflates it a stage.
 moveHose(dt,input,fire,edge){const p=this.player,wants=Math.abs(Number(input.axis)||0)>.3||Math.abs(Number(input.axisY)||0)>.3;let h=this.hose;
  if(h&&h.state==='stuck'&&(wants||!this.enemies.includes(h.target)||h.target.dying||h.target.crushed||!h.target.pump)){this.hose=h=null}
  if(!h&&edge&&!p.crushed){this.hose=h={len:0,state:'out',dx:p.dir.dx,dy:p.dir.dy,target:null};this.events.push({type:'shot'})}
  if(!h){this.movePlayer(dt,input);return}
  if(h.state==='out'){h.len+=C.hoseSpeed*dt;const tx=p.x+h.dx*h.len,ty=p.y+h.dy*h.len;
   const hit=this.enemies.filter(e=>!e.ghost&&!e.dying&&!e.crushed&&Math.abs(h.dx?e.y-p.y:e.x-p.x)<.5).map(e=>[e,h.dx?(e.x-p.x)*h.dx:(e.y-p.y)*h.dy]).filter(([,t])=>t>0&&t<=h.len+.4).sort((a,b)=>a[1]-b[1])[0];
   if(hit){h.state='stuck';h.target=hit[0];h.len=Math.max(.3,hit[1]-.35);this.pumpTimer=C.pumpEvery;this.pump(hit[0]);return}
   if(h.len>=C.hoseRange||!this.dug(Math.round(tx*S),Math.round(ty*S))||tx<0||ty<0||tx>C.cols-1||ty>C.rows-1)this.hose=null;return}
  if(edge)this.pump(h.target);else if(fire){this.pumpTimer-=dt;if(this.pumpTimer<=0)this.pump(h.target)}}
 pump(e){const h=this.hose;this.pumpTimer=C.pumpEvery;e.pump++;e.deflate=C.deflateAfter;e.fire=null;this.pumps++;this.events.push({type:'pump',stage:e.pump});
  if(e.pump>=4){const horizontal=!!h?.dx,pts=C.depthPoints[stratum(e.y)]*(e.kind==='fygar'&&horizontal?2:1);e.dying=C.popTime;e.popped=true;this.hose=null;this.award(pts);
   this.events.push({type:'pop',kind:e.kind,points:pts,horizontal,stratum:stratum(e.y),x:px(e.x),y:py(e.y)})}}
 moveEnemy(e,dt){if(e.dying||e.crushed||this.state!=='play')return;
  if(e.pump){if(this.hose?.target===e)return;e.deflate-=dt;if(e.deflate<=0){e.pump--;e.deflate=C.deflateEvery}return}
  if(e.fire){e.fire.t-=dt;if(e.fire.t<=0){if(e.fire.phase==='charge'){e.fire={phase:'burn',t:C.fireTime,dx:e.fire.dx};this.events.push({type:'fire'})}else{e.fire=null;e.fireTimer=this.between(C.fireDelay)}}return}
  const speed=C.enemySpeed+Math.min(1,(this.round-1)*.08)+(e.flee?.4:0);
  if(e.ghost){const t=e.flee?{x:0,y:0}:{x:Math.round(this.player.x),y:Math.round(this.player.y)},dx=t.x-e.x,dy=t.y-e.y,dist=Math.hypot(dx,dy),d=C.ghostSpeed*dt;e.ghostT+=dt;
   if(dist<=d){e.x=t.x;e.y=t.y}else{e.x+=dx/dist*d;e.y+=dy/dist*d;e.dir={dx:Math.sign(dx)||e.dir.dx,dy:0}}
   const c=Math.round(e.x),r=Math.round(e.y);
   // Eyes take shape again on a tunnel tile centre (the fleeing one only at the corner).
   if(e.ghostT>1&&Math.hypot(e.x-c,e.y-r)<.08&&this.cellDug(c,r)&&!this.rockAt(c,r)&&(!e.flee||(c===0&&r===0))){e.x=e.tx=c;e.y=e.ty=r;e.ghost=false;e.ghostTimer=this.between(C.ghostDelay)}return}
  if(!e.flee){e.ghostTimer-=dt*(1+(4-Math.min(4,this.alive().length))*.25);if(e.ghostTimer<=0&&on(e.x)&&on(e.y)){e.ghost=true;e.ghostT=0;this.events.push({type:'ghost'});return}}
  if(e.kind==='fygar'&&!e.flee&&e.dir.dx){e.fireTimer-=dt;if(e.fireTimer<=0&&on(e.x)&&on(e.y)){e.fire={phase:'charge',t:C.fireCharge,dx:e.dir.dx};return}}
  let d=speed*dt;const dx=e.tx-e.x,dy=e.ty-e.y,dist=Math.abs(dx)+Math.abs(dy);
  if(dist>d){e.x+=Math.sign(dx)*d;e.y+=Math.sign(dy)*d;return}
  e.x=e.tx;e.y=e.ty;if(e.flee&&e.x<=-1){e.gone=true;e.dying=1e-9;this.events.push({type:'escape'});return}this.choose(e)}
 // At each tile centre: keep going (never straight back unless it is a dead end), mostly towards the player.
 choose(e){const c=e.x,r=e.y,opts=DIRS.filter(([dx,dy])=>this.open(c,r,dx,dy));let pick=null;
  if(e.flee){if(r===0&&c===0||r===0&&this.open(c,r,-1,0))pick=[-1,0];else{const best=opts.filter(([dx,dy])=>c+dx+r+dy<c+r).sort((a,b)=>a[1]-b[1])[0];if(best)pick=best;else{e.ghost=true;e.ghostT=0;return}}}
  else{const fwd=opts.filter(([dx,dy])=>!(dx===-e.dir.dx&&dy===-e.dir.dy)),pool=fwd.length?fwd:opts;if(!pool.length)return;
   if(this.rng.next()<.25)pick=pool[Math.floor(this.rng.next()*pool.length)];
   else{const p=this.player;pick=pool.reduce((a,b)=>Math.hypot(c+b[0]-p.x,r+b[1]-p.y)<Math.hypot(c+a[0]-p.x,r+a[1]-p.y)?b:a)}}
  e.dir={dx:pick[0],dy:pick[1]};e.tx=c+pick[0];e.ty=r+pick[1]}
 // Rocks: once the tile below is dug they wobble and drop, carrying down whatever is underneath, until they meet dirt.
 moveRocks(dt){const p=this.player;
  for(const k of this.rocks){
   if(k.state==='still'){const under=Math.abs(p.x-k.c)<.6&&p.y>k.r&&p.y<k.r+1.7;if(this.cellDug(k.c,k.r+1)&&!under){k.state='wobble';k.t=C.rockWobble;this.events.push({type:'wobble'})}}
   else if(k.state==='wobble'){k.t-=dt;if(k.t<=0){k.state='fall';this.rocksDropped++;this.events.push({type:'rockFall'})}}
   else if(k.state==='fall'){const ny=k.y+C.rockSpeed*dt,rr=Math.floor(ny);let land=false;
    if(rr>Math.floor(k.y)||rr>=C.rows-1){if(rr>=C.rows-1||!this.cellDug(k.c,rr+1))land=true}
    k.y=land?rr:ny;for(let fy=k.r*S;fy<=Math.round(k.y*S);fy++)this.dig(k.c*S,fy);
    for(const e of this.enemies)if(!e.dying&&!e.ghost&&!e.crushed&&Math.abs(e.x-k.c)<.6&&e.y>k.y-.3&&e.y<k.y+1){e.crushed=k;k.caught.push(e);if(this.hose?.target===e)this.hose=null}
    for(const e of k.caught){e.x=k.c;e.y=k.y+.5}
    if(this.state==='play'&&!p.crushed&&Math.abs(p.x-k.c)<.6&&p.y>k.y+.2&&p.y<k.y+1){p.crushed=k;this.hose=null}
    if(p.crushed===k)p.y=Math.min(C.rows-1,k.y+.6);
    if(land){k.state='break';k.t=C.rockBreak;const n=k.caught.length;
     if(n){const pts=C.crushPoints[Math.min(n,8)-1];this.award(pts);this.events.push({type:'crush',count:n,points:pts,x:px(k.c),y:py(k.y+.5)})}
     for(const e of k.caught){e.dying=C.rockBreak;e.flat=true}this.events.push({type:'rockLand',x:px(k.c),y:py(k.y)});if(p.crushed===k)this.die()}}
   else if(k.state==='break'){k.t-=dt;if(k.t<=0)k.state='gone'}}
  this.rocks=this.rocks.filter(k=>k.state!=='gone')}
 // Touching an enemy (eyes too) or its fire costs a life; inflated enemies are safe to touch.
 collide(){const p=this.player;if(p.crushed)return;
  for(const e of this.enemies){if(e.dying||e.crushed)continue;
   if(!e.pump&&Math.hypot(e.x-p.x,e.y-p.y)<.7)return this.die();
   if(e.fire?.phase==='burn'){const ahead=(p.x-e.x)*e.fire.dx;if(ahead>.3&&ahead<.5+C.fireRange&&Math.abs(p.y-e.y)<.5)return this.die()}}}
 die(){this.lives--;this.hose=null;this.events.push({type:'death',x:px(this.player.x),y:py(this.player.y),lives:this.lives,crushed:!!this.player.crushed});
  if(this.lives<=0){this.state='end';this.events.push({type:'gameover',score:this.score})}else{this.state='dead';this.timer=C.deathPause}}
 fireZone(e){return e.fire?.phase==='burn'?{x0:e.x+e.fire.dx*.5,x1:e.x+e.fire.dx*(.5+C.fireRange),y:e.y}:null}
 // Demo pilot: heads for the nearest enemy, lines up on its row or column and pumps it; steers clear of rocks and fire.
 basePilot(){const p=this.player,h=this.hose;this.flip=!this.flip;
  if(h&&h.state==='stuck')return{axis:0,axisY:0,fire:this.flip};if(h)return{axis:0,axisY:0,fire:true};
  const targets=this.enemies.filter(e=>!e.dying&&!e.crushed&&!e.ghost);
  const danger=this.enemies.find(e=>e.fire&&Math.abs(e.y-p.y)<.6&&(p.x-e.x)*e.fire.dx>0&&(p.x-e.x)*e.fire.dx<C.fireRange+1);
  if(this.detour&&this.detour.t>0){this.detour.t-=C.step;return{axis:this.detour.dx,axisY:this.detour.dy,fire:false}}
  if(danger){const dy=p.y>=C.rows-2?-1:1;this.detour={dx:0,dy,t:.4};return{axis:0,axisY:dy,fire:false}}
  if(!targets.length)return{axis:0,axisY:0,fire:false};
  const threat=this.enemies.find(e=>!e.dying&&!e.crushed&&!e.pump&&Math.hypot(e.x-p.x,e.y-p.y)<1.5&&(e.ghost||Math.abs(e.x-p.x)>.3&&Math.abs(e.y-p.y)>.3));
  if(threat){const ax=p.dir.dx?'x':'y',away=Math.sign((ax==='x'?p.x-threat.x:p.y-threat.y))||1;this.detour=ax==='x'?{dx:away,dy:0,t:.35}:{dx:0,dy:away,t:.35};return{axis:this.detour.dx,axisY:this.detour.dy,fire:false}}
  const t=targets.reduce((a,b)=>Math.abs(b.x-p.x)+Math.abs(b.y-p.y)<Math.abs(a.x-p.x)+Math.abs(a.y-p.y)?b:a),dx=t.x-p.x,dy=t.y-p.y;
  // Fire when the enemy is in line within reach with an open tunnel between; otherwise dig towards a spot two tiles beside it.
  const clear=(ax,n)=>{for(let k=1;k<n*S;k++)if(!this.dug(Math.round(p.x*S)+(ax?Math.sign(dx)*k:0),Math.round(p.y*S)+(ax?0:Math.sign(dy)*k)))return false;return true};
  if(Math.abs(dy)<.3&&on(p.y)&&Math.abs(dx)<C.hoseRange+.2){if(Math.sign(dx)!==p.dir.dx)return{axis:Math.sign(dx),axisY:0,fire:false};return clear(true,Math.abs(dx)-.5)?{axis:0,axisY:0,fire:this.flip}:{axis:Math.sign(dx),axisY:0,fire:false}}
  if(Math.abs(dx)<.3&&on(p.x)&&Math.abs(dy)<C.hoseRange+.2){if(Math.sign(dy)!==p.dir.dy)return{axis:0,axisY:Math.sign(dy),fire:false};return clear(false,Math.abs(dy)-.5)?{axis:0,axisY:0,fire:this.flip}:{axis:0,axisY:Math.sign(dy),fire:false}}
  const before={x:p.x,y:p.y};this.last??=before;if(Math.hypot(this.last.x-p.x,this.last.y-p.y)<.001)this.stuck+=C.step;else this.stuck=0;this.last=before;
  if(this.stuck>.6){this.stuck=0;const k=Math.floor(this.clock*7.7)%4,r=k&1?1:-1;this.detour=k&2?{dx:r,dy:0,t:.5}:{dx:0,dy:r,t:.5}}
  const side=t.x-2<0?1:t.x+2>C.cols-1?-1:dx>0?-1:1,gx=t.x+2*side,gy=t.y;
  if(Math.abs(gx-p.x)>.05&&!(Math.abs(dy)<.3))return{axis:Math.sign(gx-p.x),axisY:0,fire:false};
  if(Math.abs(gy-p.y)>.05)return{axis:0,axisY:Math.sign(gy-p.y),fire:false};return{axis:Math.sign(gx-p.x),axisY:0,fire:false}}
 // The demo pilot plays its next moves out on a copy of the game for a moment; if Doug would be lost it tries the
 // other ways, waiting or the pump instead. It only ever sets the player's input.
 // Its own luck runs apart from the game's dice, so it never changes the round.
 luck(){let t=this.aiLuck=((this.aiLuck??Math.imul(this.rng.value,0x9e3779b1))+0x6d2b79f5)>>>0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}
 copy(){const o={},k=Object.create(DigDugEngine.prototype);for(const [n,v] of Object.entries(this))if(n!=='rng'&&n!=='events'&&typeof v!=='function')o[n]=v;
  Object.assign(k,structuredClone(o));k.rng=new SeededRandom(this.rng.value);k.events=[];return k}
 tryMove(first,hold,limit){const k=this.copy(),s0=k.score;let t=0;
  for(;t<limit;t+=C.step){const m=t<hold?first:k.basePilot();k.step(C.step,m);for(const v of k.events){if(v.type==='death')return{dead:true,val:-1e6+t};if(v.type==='cleared')return{dead:false,val:1e5}}k.events.length=0;if(k.state!=='play')break}
  return{dead:false,val:k.score-s0+k.enemies.reduce((n,e)=>n+e.pump*60,0)}}
 pilot(){if(this.state!=='play')return this.basePilot();const H=DigDugEngine.lookAhead,A=this.aiMove;
  if(A&&this.clock<A.until&&this.clock>A.until-2)return A.m.fire?{...A.m,fire:this.flip=!this.flip}:A.m;this.aiMove=null;
  if(this.aiNext>this.clock&&this.aiNext-this.clock<1)return this.basePilot();this.aiNext=this.clock+.1;
  // A good human, not a perfect one: now and then it stops looking ahead for a moment (DigDugEngine.slip).
  if(this.aiBlind>this.clock&&this.aiBlind-this.clock<2)return this.basePilot();if(this.luck()<DigDugEngine.slip){this.aiBlind=this.clock+DigDugEngine.blind;return this.basePilot()}
  // and it stops to think now and then, when standing still is safe.
  if(!this.hose&&this.luck()<DigDugEngine.rest){const hold=.3+this.luck()*.5;if(!this.tryMove({axis:0,axisY:0,fire:false},hold,H).dead){this.aiMove={m:{axis:0,axisY:0,fire:false},until:this.clock+hold-1e-9};return this.aiMove.m}}
  const save=[this.flip,this.stuck,this.last,this.detour&&{...this.detour}],base=this.basePilot(),after=[this.flip,this.stuck,this.last,this.detour];
  [this.flip,this.stuck,this.last,this.detour]=save;const ok=!this.tryMove(base,0,H).dead;[this.flip,this.stuck,this.last,this.detour]=after;if(ok)return base;
  let best=null;for(const m of [{},{axis:-1},{axis:1},{axisY:-1},{axisY:1},{fire:true}])for(const hold of [.15,.4,.8]){const r=this.tryMove(m,hold,H+hold);if(!best||r.val>best.val)best={m,hold,val:r.val}}
  this.detour=null;this.aiMove={m:best.m,until:this.clock+best.hold-1e-9};return best.m}
 snapshot(){return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,lives:this.lives,round:this.round,pumps:this.pumps,digs:this.digs,player:{x:+this.player.x.toFixed(3),y:+this.player.y.toFixed(3)},
  enemies:this.enemies.map(e=>[e.kind,+e.x.toFixed(3),+e.y.toFixed(3),e.ghost?1:0,e.pump]),rocks:this.rocks.map(k=>[k.c,+k.y.toFixed(3),k.state]),veggie:this.veggie?.kind||null}}
}
DigDugEngine.lookAhead=1.5;DigDugEngine.slip=.035;DigDugEngine.blind=1.2;DigDugEngine.rest=.06;
const DigDougCore={CONFIG,DigDugEngine,SeededRandom,px,py,stratum,FW,FH};
g.DigDougCore=DigDougCore;if(typeof module!=='undefined')module.exports=DigDougCore;
})(globalThis);
