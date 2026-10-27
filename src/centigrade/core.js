'use strict';
/* Centigrade: Atari Centipede (1981) rules, drawn as a centipede of grade letters crawling through her erasers.
   Rules follow the original cabinet: the field is a grid scattered with mushrooms (erasers); a 12-segment centipede
   enters at the top and walks sideways, dropping a row and turning back whenever it meets a mushroom or the edge;
   at the bottom it turns and walks up and down inside the player area, and from then on extra single heads join
   from the sides; a poisoned mushroom sends a head straight down to the bottom; a shot segment turns into a
   mushroom and the segment behind it becomes a new head; each wave brings one more separate head and a shorter
   body; mushrooms take four hits; the spider zigzags through the player area eating mushrooms; the flea drops
   straight down leaving mushrooms when few are left in the player area, from wave 2; the scorpion crosses the
   upper field poisoning mushrooms, from wave 3; the player moves freely in the bottom area, blocked by mushrooms,
   and holding fire keeps firing, one shot on screen at a time. Scoring by the cabinet's table: head 100, body 10,
   mushroom 1, flea 200, scorpion 1,000, spider 300, 600 or 900 the closer it is; after a lost life every damaged
   or poisoned mushroom is restored for 5 points; three lives and an extra life every 12,000 (MAME's switch default; Atari's
   design notes CENTIP.DOC star 15,000). Values checked 2026-10-26 against Atari's source CENTI.MAC.
   Speeds and timings from CENTI.MAC and Ed Logg's CENTIP.DOC (2026-10-31, core 0.3.0): the cabinet moves things 1
   pixel (slow) or 2 pixels (fast) a frame, 7.5 or 15 cells a second. Wave 1 is a fast 12; then each pair of waves
   loses one body segment for one more fast head, the first of the pair slow and the second fast (11 slow + 1 head,
   11 fast + 1, 10 slow + 2, ...), from 40,000 points no more slow ones and one less segment every wave; after the
   wave of twelve heads it starts over. The last segment alive speeds up. Once a head reaches the bottom row, new heads
   come in from the sides, the first after 3.2 s and then more often (8 frames sooner each time, never under 1.6 s,
   and 2 frames sooner every 10,000 points), while fewer than twelve segments are alive. The flea comes whenever
   fewer than 5 mushrooms are left in the player area (9 from 20,000 points, more from 120,000), except on the
   twelve-segment waves, and falls faster from 60,000. The scorpion may come from the waves of ten segments or fewer,
   a 1 in 4 chance every 256 frames, never with a flea on the page, slow or (from 20,000, mostly) fast. The spider
   is slow below 1,000 points and fast after, zigzags with pauses in its sideways run, eats every mushroom it
   crosses, keeps lower from 60,000 points, scores 900 within 22 pixels of the player and 600 within 64. A new life
   is only given while the player has fewer than six.
   Adaptations (not ROM-exact): the field is 30 by 22 cells on the 4:3 page (spider heights scaled from the
   cabinet's 32 rows); the centipede steps cell to cell. */
(function(g){
const CONFIG=Object.freeze({version:'0.3.0',width:1024,height:768,step:1/120,record:[['axis','n',-3,3,60],['axisY','n',-3,3,60],['fire','b']],
  cell:32,cols:30,rows:22,left:32,top:64,zoneRows:5,mushrooms:42,
  segments:12,fastCells:15,slowCells:7.5,onlyFastFrom:40000,headFirst:3.2,headStep:8/60,headScore:2/60,headMin:1.6,
  points:Object.freeze({head:100,body:10,mushroom:1,flea:200,scorpion:1000,restore:5}),spiderPoints:Object.freeze([900,600,300]),
  mushroomHits:4,shotSpeed:2400,playerSpeed:300,playerR:12,
  spiderSlow:240,spiderFast:480,spiderFastFrom:1000,spiderTurn:.8,spiderFlip:.75,spiderDelay:Object.freeze([1.8,2.4]),spiderKillDelay:3.7,spiderEat:1,
  spiderNear:22,spiderMid:64,spiderRange:96,cabinetRows:32,
  fleaBelow:12,fleaMin:Object.freeze([5,9]),fleaSpeed:480,fleaFast:720,fleaDrop:.25,fleaDelay:.25,
  scorpionBelow:11,scorpionCheck:256/60,scorpionOdds:.25,scorpionSpeed:240,scorpionFast:480,
  lives:3,maxLives:6,extraEvery:12000,deathPause:1.6,waveDelay:1});
class SeededRandom{constructor(seed=1981){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const C=CONFIG,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),zoneTop=C.rows-C.zoneRows,bottom=C.rows-1;
const cx=c=>C.left+(c+.5)*C.cell,cy=r=>C.top+(r+.5)*C.cell;
class CentipedeEngine{
 constructor(seed=1981){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=C.lives;this.nextExtra=C.extraEvery;this.wave=0;this.shots=0;this.nextId=0;this.centin=C.segments;this.centis=2;this.headGap=C.headFirst;this.headTimer=C.headFirst;
  this.grid=[...Array(C.rows)].map(()=>Array(C.cols).fill(null));
  // Mushrooms anywhere but the bottom row, where the player starts.
  for(let n=0;n<C.mushrooms;){const c=Math.floor(this.rng.next()*C.cols),r=Math.floor(this.rng.next()*(bottom-1))+1;if(!this.grid[r][c]){this.grid[r][c]={hp:C.mushroomHits,poison:false};n++}}
  this.player={x:cx(C.cols/2),y:cy(bottom)};this.shot=null;this.spider=null;this.flea=null;this.scorpion=null;
  this.spiderTimer=this.between(C.spiderDelay);this.fleaTimer=C.fleaDelay;this.scorpionTimer=C.scorpionCheck;this.state='play';this.timer=0;this.newWave();return this}
 between([a,b]){return a+(b-a)*this.rng.next()}
 mush(c,r){return r>=0&&r<C.rows&&c>=0&&c<C.cols?this.grid[r][c]:null}
 seg(c,r,dir){return{id:this.nextId++,c,r,pc:c,pr:r,dir,alive:true}}
 chain(c,r,dir,n,vdir=1,fast=true){const segs=[...Array(n)].map(()=>this.seg(c,r,dir));return{segs,vdir,diving:false,fast,t:0}}
 // The cabinet's wave cycle (CENTPC): after a cleared wave the speed steps up; past fast it drops back to slow (fast
 // only from 40,000) and the body gives one segment to a separate fast head; after twelve heads it starts over.
 newWave(){this.wave++;if(this.wave>1&&++this.centis>=3){if(!--this.centin)this.centin=C.segments;this.centis=this.score>=C.onlyFastFrom?2:1}
  this.spawnTop([[this.centin,this.centis>=2],...Array(C.segments-this.centin).fill([1,true])]);this.reachedBottom=false;this.events.push({type:'wave',wave:this.wave})}
 spawnTop(list){this.chains=list.map(([n,fast],i)=>{const c=i===0?Math.floor(C.cols/2):Math.floor(this.rng.next()*C.cols);return this.chain(c,-1,this.rng.next()<.5?1:-1,n,1,fast)})}
 // Cells a second for a chain: slow or fast, and the very last segment alive always fast.
 rate(ch){return ch&&(ch.fast||this.segments().length===1)?C.fastCells:C.slowCells}
 segments(){return this.chains.flatMap(ch=>ch.segs)}
 // The head picks its next cell; every body segment steps into the cell the one ahead of it just left.
 advance(ch){const s=ch.segs,h=s[0],old=s.map(x=>[x.c,x.r]);let c=h.c,r=h.r;
  const down=()=>{r=Math.min(bottom,h.r+1)};
  if(h.r<0)down();
  else if(ch.diving){if(h.r<bottom)down();else{ch.diving=false;ch.vdir=-1}}
  if(c===h.c&&r===h.r){const nc=h.c+h.dir,m=this.mush(nc,h.r);
   if(nc>=0&&nc<C.cols&&!m||h.c<0&&h.dir>0||h.c>=C.cols&&h.dir<0)c=nc;
   else if(m?.poison&&h.r<bottom){ch.diving=true;down();h.dir=-h.dir}
   else{let nr=h.r+ch.vdir;if(nr>bottom){ch.vdir=-1;nr=h.r-1}else if(ch.vdir<0&&nr<zoneTop){ch.vdir=1;nr=h.r+1}r=nr;h.dir=-h.dir}}
  if(r===bottom&&!ch.diving)this.reachedBottom=true;
  s.forEach((x,i)=>{x.pc=x.c;x.pr=x.r;const [nc,nr]=i?old[i-1]:[c,r];if(nc!==x.c&&i)x.dir=Math.sign(nc-x.c);x.c=nc;x.r=nr})}
 pos(s,ch=this.chains.find(c=>c.segs.includes(s))){const p=ch?clamp(ch.t*this.rate(ch),0,1):1;return{x:cx(s.pc)+(cx(s.c)-cx(s.pc))*p,y:cy(s.pr)+(cy(s.r)-cy(s.pr))*p}}
 // Every 10,000 points new heads come a little sooner; a new life only while fewer than six are left.
 award(n){const tenK=Math.floor(this.score/10000);this.score+=n;this.headGap=Math.max(C.headMin-C.headStep,this.headGap-C.headScore*(Math.floor(this.score/10000)-tenK));
  while(this.score>=this.nextExtra){this.nextExtra+=C.extraEvery;if(this.lives<C.maxLives){this.lives++;this.events.push({type:'extra'})}}}
 // A shot segment becomes a mushroom where it stood; the one behind it leads the rest as a new head.
 killSegment(ch,i){const s=ch.segs[i],head=i===0,p=this.pos(s,ch);s.alive=false;const pts=head?C.points.head:C.points.body;this.award(pts);
  if(s.r>=0&&s.r<C.rows&&s.c>=0&&s.c<C.cols&&!this.grid[s.r][s.c])this.grid[s.r][s.c]={hp:C.mushroomHits,poison:false};
  const back=ch.segs.slice(i+1);ch.segs=ch.segs.slice(0,i);if(back.length)this.chains.push({segs:back,vdir:ch.vdir,diving:false,fast:ch.fast,t:ch.t});
  this.chains=this.chains.filter(x=>x.segs.length);this.events.push({type:'kill',kind:head?'head':'body',points:pts,x:p.x,y:p.y});return pts}
 hitMushroom(c,r){const m=this.grid[r][c];m.hp--;if(m.hp<=0){this.grid[r][c]=null;this.award(C.points.mushroom);this.events.push({type:'mushroom',x:cx(c),y:cy(r)})}}
 // Spider points by height above the player, the cabinet's 22 and 64 pixels (of 8-pixel cells) scaled to this field.
 spiderPoints(){const d=Math.abs(this.spider.y-this.player.y)/C.cell*C.cabinetRows/C.rows*8;return C.spiderPoints[d<C.spiderNear?0:d<C.spiderMid?1:2]}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  if(this.state==='dead'||this.state==='cleared'){this.timer-=dt;if(this.timer<=0){if(this.state==='cleared')this.newWave();else this.respawn();this.state='play'}return}
  // Centipede: each chain steps cell to cell at its own speed.
  for(const ch of this.chains.slice()){ch.t+=dt;const T=1/this.rate(ch);if(ch.t>=T){ch.t-=T;this.advance(ch)}}
  // Once a head has reached the bottom, single fast heads come in from the sides, more often as the game goes on.
  if(this.reachedBottom){if(this.headTimer>0)this.headTimer-=dt;if(this.headTimer<=0&&this.segments().length<C.segments){if(this.headGap>=C.headMin)this.headGap-=C.headStep;this.headTimer=this.headGap;
   const right=this.rng.next()<.5;this.chains.push(this.chain(right?C.cols:-1,zoneTop-1,right?-1:1,1,1,true));this.events.push({type:'head'})}}
  this.movePlayer(dt,input);
  if(input.fire&&!this.shot){this.shot={x:this.player.x,y:this.player.y-C.playerR};this.shots++;this.events.push({type:'shot'})}
  this.moveSpider(dt);this.moveFlea(dt);this.moveScorpion(dt);this.moveShot(dt);
  if(this.state==='play')this.collide();
  if(this.state==='play'&&!this.chains.length){this.state='cleared';this.timer=C.waveDelay;this.events.push({type:'cleared',wave:this.wave})}}
 blocked(x,y){const R=C.playerR;for(const [px,py] of [[x-R,y-R],[x+R,y-R],[x-R,y+R],[x+R,y+R]]){const c=Math.floor((px-C.left)/C.cell),r=Math.floor((py-C.top)/C.cell);if(this.mush(c,r))return true}return false}
 // Like the cabinet's trackball (2026-10-30, owner: instant touch), an analog push may reach three times the stick speed;
 // keys and a stick at full tilt stay at 1.
 movePlayer(dt,input){const p=this.player,ax=clamp(Number(input.axis)||0,-3,3)||((input.right?1:0)-(input.left?1:0)),ay=clamp(Number(input.axisY)||0,-3,3)||((input.down?1:0)-(input.up?1:0));
  const nx=clamp(p.x+ax*C.playerSpeed*dt,C.left+C.playerR,C.left+C.cols*C.cell-C.playerR),ny=clamp(p.y+ay*C.playerSpeed*dt,C.top+zoneTop*C.cell+C.playerR,C.top+C.rows*C.cell-C.playerR);
  if(!this.blocked(nx,p.y))p.x=nx;if(!this.blocked(p.x,ny))p.y=ny}
 moveShot(dt){const s=this.shot;if(!s)return;s.y-=C.shotSpeed*dt;if(s.y<C.top){this.shot=null;return}
  const c=Math.floor((s.x-C.left)/C.cell),r=Math.floor((s.y-C.top)/C.cell),near=(o,rad)=>o&&Math.abs(o.x-s.x)<rad&&Math.abs(o.y-s.y)<rad;
  for(const ch of this.chains)for(let i=0;i<ch.segs.length;i++){const p=this.pos(ch.segs[i],ch);if(Math.abs(p.x-s.x)<C.cell*.5&&Math.abs(p.y-s.y)<C.cell*.5){this.shot=null;this.killSegment(ch,i);return}}
  if(this.mush(c,r)){this.shot=null;this.hitMushroom(c,r);return}
  if(near(this.spider,C.cell*.75)){const pts=this.spiderPoints();this.award(pts);this.events.push({type:'spider',points:pts,x:this.spider.x,y:this.spider.y});this.spider=null;this.spiderTimer=C.spiderKillDelay;this.shot=null;return}
  if(near(this.flea,C.cell*.5)){this.shot=null;if(--this.flea.hp<=0){this.award(C.points.flea);this.events.push({type:'flea',points:C.points.flea,x:this.flea.x,y:this.flea.y});this.flea=null;this.fleaTimer=C.fleaDelay}else this.flea.vy*=2;return}
  if(near(this.scorpion,C.cell*.6)){this.award(C.points.scorpion);this.events.push({type:'scorpion',points:C.points.scorpion,x:this.scorpion.x,y:this.scorpion.y});this.scorpion=null;this.scorpionTimer=C.scorpionCheck;this.shot=null}}
 // The top of the spider's beat: 96 cabinet pixels above the bottom, 8 lower for every 20,000 points from 60,000 (at most 40).
 spiderTop(){const lower=8*Math.min(5,Math.max(0,Math.floor((Math.floor(this.score/10000)-6)/2)));return C.top+C.rows*C.cell-(C.spiderRange-lower)/8*C.rows/C.cabinetRows*C.cell}
 // Spider: in from a side, zigzagging diagonally through the player area; every 0.8 s it may pause or resume its
 // sideways run and mostly turns up or down; it eats every mushroom it crosses.
 moveSpider(dt){if(!this.spider){this.spiderTimer-=dt;if(this.spiderTimer<=0){const right=this.rng.next()<.5,v=this.score<C.spiderFastFrom?C.spiderSlow:C.spiderFast;this.spider={x:right?C.left+C.cols*C.cell+20:C.left-20,y:this.spiderTop(),vx:(right?-1:1)*v,vy:v,v,run:(right?-1:1)*v,turn:C.spiderTurn,cell:null};this.events.push({type:'spiderIn'})}return}
  const sp=this.spider,lo=this.spiderTop(),hi=C.top+C.rows*C.cell-C.cell/2;sp.x+=sp.vx*dt;sp.y+=sp.vy*dt;
  if((sp.turn-=dt)<=0){sp.turn=C.spiderTurn;const inside=sp.x>C.left+C.cell&&sp.x<C.left+(C.cols-1)*C.cell;if(this.rng.next()<.5)sp.vx=sp.vx?inside?0:sp.vx:sp.run;if(this.rng.next()<C.spiderFlip)sp.vy=-sp.vy}
  if(sp.y>hi){sp.y=hi;sp.vy=-sp.v}else if(sp.y<lo){sp.y=lo;sp.vy=sp.v}
  const c=Math.floor((sp.x-C.left)/C.cell),r=Math.floor((sp.y-C.top)/C.cell),key=c+','+r;if(key!==sp.cell){sp.cell=key;if(this.mush(c,r)&&this.rng.next()<C.spiderEat)this.grid[r][c]=null}
  if(sp.x<C.left-40||sp.x>C.left+C.cols*C.cell+40){this.spider=null;this.spiderTimer=this.between(C.spiderDelay)}}
 zoneMushrooms(){let n=0;for(let r=zoneTop;r<C.rows;r++)for(let c=0;c<C.cols;c++)if(this.grid[r][c])n++;return n}
 // Flea: not on the twelve-segment waves; when few mushrooms are left in the player area it drops straight down, leaving new ones.
 fleaMin(){return this.score<20000?C.fleaMin[0]:this.score<120000?C.fleaMin[1]:Math.floor(this.score/20000)+6}
 moveFlea(dt){if(!this.flea){if(this.centin>=C.fleaBelow||this.scorpion||this.zoneMushrooms()>=this.fleaMin())return;this.fleaTimer-=dt;if(this.fleaTimer<=0){const c=Math.floor(this.rng.next()*C.cols);this.flea={x:cx(c),y:C.top-10,vy:this.score>=60000?C.fleaFast:C.fleaSpeed,hp:2,row:-1};this.events.push({type:'fleaIn'})}return}
  const f=this.flea;f.y+=f.vy*dt;const r=Math.floor((f.y-C.top)/C.cell),c=Math.floor((f.x-C.left)/C.cell);
  if(r!==f.row){f.row=r;if(r>=1&&r<bottom&&!this.grid[r][c]&&this.rng.next()<C.fleaDrop)this.grid[r][c]={hp:C.mushroomHits,poison:false}}
  if(f.y>C.top+C.rows*C.cell+20){this.flea=null;this.fleaTimer=C.fleaDelay}}
 // Scorpion: on the waves of ten segments or fewer, a 1 in 4 chance every 256 frames while no flea is falling; it crosses
 // the upper field and poisons every mushroom it walks over; from 20,000 points it is mostly fast.
 moveScorpion(dt){if(!this.scorpion){if(this.centin>=C.scorpionBelow||this.flea)return;this.scorpionTimer-=dt;if(this.scorpionTimer<=0){this.scorpionTimer=C.scorpionCheck;if(this.rng.next()>=C.scorpionOdds)return;const right=this.rng.next()<.5,r=1+Math.floor(this.rng.next()*(zoneTop-4)),v=this.score>=20000&&this.rng.next()<.75?C.scorpionFast:C.scorpionSpeed;this.scorpion={x:right?C.left+C.cols*C.cell+20:C.left-20,y:cy(r),row:r,vx:(right?-1:1)*v};this.events.push({type:'scorpionIn'})}return}
  const s=this.scorpion;s.x+=s.vx*dt;const c=Math.floor((s.x-C.left)/C.cell),m=this.mush(c,s.row);if(m)m.poison=true;
  if(s.x<C.left-40||s.x>C.left+C.cols*C.cell+40){this.scorpion=null;this.scorpionTimer=C.scorpionCheck}}
 collide(){const p=this.player,hit=(o,rad)=>o&&Math.hypot(o.x-p.x,o.y-p.y)<rad;
  for(const ch of this.chains)for(const s of ch.segs)if(hit(this.pos(s,ch),C.cell*.62))return this.die();
  if(hit(this.spider,C.cell*.75)||hit(this.flea,C.cell*.6))this.die()}
 die(){this.lives--;this.shot=null;this.events.push({type:'death',x:this.player.x,y:this.player.y,lives:this.lives});
  if(this.lives<=0){this.state='end';this.events.push({type:'gameover',score:this.score})}else{this.state='dead';this.timer=C.deathPause}}
 // After a lost life every damaged or poisoned mushroom is made whole for 5 points, and the centipede starts again at the top.
 respawn(){let n=0;for(const row of this.grid)for(const m of row)if(m&&(m.hp<C.mushroomHits||m.poison)){m.hp=C.mushroomHits;m.poison=false;n++;this.award(C.points.restore)}
  if(n)this.events.push({type:'restore',count:n});
  // The same speeds as before (no change until the whole centipede is gone); new heads wait the current gap again.
  this.spawnTop(this.chains.map(ch=>[ch.segs.length,ch.fast]).sort((a,b)=>b[0]-a[0]));this.reachedBottom=false;this.headTimer=this.headGap;
  this.spider=null;this.flea=null;this.scorpion=null;this.spiderTimer=this.between(C.spiderDelay);this.player={x:cx(C.cols/2),y:cy(bottom)};
  if(this.blocked(this.player.x,this.player.y))for(let c=0;c<C.cols;c++)this.grid[bottom][c]=null}
 // Demo pilot: stays low under the nearest segment and keeps firing, stepping away from the spider and the flea.
 pilot(){const p=this.player,segs=this.chains.flatMap(ch=>ch.segs.map(s=>this.pos(s,ch)));let x=p.x;
  if(segs.length){const t=segs.reduce((a,b)=>Math.abs(b.x-p.x)-b.y*.5<Math.abs(a.x-p.x)-a.y*.5?b:a);x=t.x}
  for(const o of [this.spider,this.flea])if(o&&Math.abs(o.x-p.x)<110&&o.y>p.y-200)x=p.x+(o.x<p.x?140:-140);
  const near=segs.find(s=>Math.abs(s.x-p.x)<C.cell*1.2&&s.y>p.y-C.cell*1.5),d=x-p.x;
  return{axis:Math.abs(d)<4?0:clamp(d/30,-1,1),axisY:near?-1:1,fire:true}}
 snapshot(){return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,lives:this.lives,wave:this.wave,shots:this.shots,player:{x:+this.player.x.toFixed(2),y:+this.player.y.toFixed(2)},
  chains:this.chains.map(ch=>ch.segs.map(s=>[s.c,s.r])),mushrooms:this.grid.flat().filter(Boolean).length,spider:!!this.spider,flea:!!this.flea,scorpion:!!this.scorpion}}
}
const CentigradeCore={CONFIG,CentipedeEngine,SeededRandom,cx,cy};
g.CentigradeCore=CentigradeCore;if(typeof module!=='undefined')module.exports=CentigradeCore;
})(globalThis);
