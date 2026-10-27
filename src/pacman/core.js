'use strict';
/* Snack-Man: Namco Pac-Man (1980) rules, drawn as a snack-man and lunch-bag ghosts in her ballpoint maze.
   Rules follow the original cabinet: the 28 x 31 tile maze with 240 dots (10 points) and 4 power pellets (50); the
   side tunnel wraps and slows the ghosts; four ghosts with their own chase targets (red: the player's tile; pink: four
   tiles ahead of him; cyan: the point that doubles the vector from red to two tiles ahead; orange: the player when
   more than eight tiles away, else its corner); ghosts alternate scatter and chase on the level-1 timer
   (7/20/7/20/5/20/5 seconds, then chase), reverse direction at every switch, never reverse on their own, choose at each
   tile the turn that brings them closest to their target (ties up, left, down, right) and cannot turn up at the four
   tiles above and below the ghost house; a power pellet frightens them (they reverse, turn at random and slow down)
   and eating them in a row scores 200, 400, 800 and 1600, each bite stopping the action for a moment while its points show; their eyes return home and they come back; the house
   releases pink at once, cyan after 30 dots and orange after 60 (level 2: cyan at once, orange after 50; from level
   3 all at once; after a lost life: 7, 17 and 32; or after a while with no dot eaten); a bonus fruit
   appears below the house after 70 and 170 dots (cherries 100, strawberry 300, orange 500, apple 700, grapes 1000,
   rocket 2000, bell 3000, key 5000 by level); an extra life at 10,000; three lives; clearing the maze starts the
   next level, faster, with shorter fright. Values checked 2026-10-26 against the Pac-Man Dossier
   (pacman.holenet.info) and MAME pacman.cpp switch defaults.
   Level tables (checked 2026-10-31 against the Pac-Man Dossier): speeds as a share of 75.76 pixels (9.47 tiles) a
   second, level 1: player 80% (90% frightened), ghosts 75%, 50% frightened, 40% in the tunnel; levels 2-4: 90/95,
   85, 55, 45; levels 5-20: 100/100, 95, 60, 50; level 21 on: player 90%; the player stops for 1 frame on each dot and
   3 on each power pellet; scatter and chase 7/20/7/20/5/20/5 on level 1, 7/20/7/20/5/1033/1 frame on levels 2-4 and
   5/20/5/20/5/1037/1 frame from level 5; fright 6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1, then 0 s; red
   turns "Cruise Elroy" with 20, 30, 40, 40, 40, 50, 50, 50, 60, 60, 60, 80, 80, 80, 100, 100, 100, 100, 120 dots
   left (80/85% on level 1, 90/95% on 2-4, 100/105% after; the second step at half the dots), chasing the player even
   in scatter, held back after a lost life until orange leaves the house; pink's target 4 tiles ahead and cyan's 2
   ahead also shift as many tiles left when the player faces up (the cabinet's overflow); the release timer is 4 s,
   3 s from level 5; the player cuts corners, turning up to a third of a tile before or after a tile centre and
   moving diagonally back onto the new line.
   Adaptations (not ROM-exact): the house exit is simplified; eyes return at a fixed speed. */
(function(g){
// The school floor plan (owner 2026-10-28): Pac-Man's size, tunnel, ghost house and start, with new classroom blocks above
// and gym and cafeteria blocks below; 240 quarters and 4 pizzas as on the cabinet, an empty lobby where she starts.
const MAZE=[
'############################',
'#.....#......##......#.....#',
'#.###.#.####.##.####.#.###.#',
'#o###.#.####.##.####.#.###o#',
'#.###.#.####.##.####.#.###.#',
'#..........................#',
'#.####.##.########.##.####.#',
'#.####.##.########.##.####.#',
'#......##....##....##......#',
'######.##### ## #####.######',
'     #.##### ## #####.#     ',
'     #.##          ##.#     ',
'     #.## ###--### ##.#     ',
'######.## #      # ##.######',
'      .   #      #   .      ',
'######.## #      # ##.######',
'     #.## ######## ##.#     ',
'     #.##          ##.#     ',
'     #.## ######## ##.#     ',
'######.## ######## ##.######',
'#............##............#',
'#.####.#####.##.#####.####.#',
'#.####.#####.##.#####.####.#',
'#o..##....        ....##..o#',
'###.##.####.####.####.##.###',
'###.##.####.####.####.##.###',
'#......##...####...##......#',
'#.####.##.########.##.####.#',
'#.####.##.########.##.####.#',
'#..........................#',
'############################'];
const CONFIG=Object.freeze({version:'0.3.0',width:1024,height:768,step:1/120,record:[['dir','e',[null,'up','left','down','right']]],cols:28,rows:31,maze:Object.freeze(MAZE),
  pacStart:Object.freeze([14,23.5]),ghostDoor:Object.freeze([14,11.5]),houseY:14.5,
  // 100% speed in tiles a second; per level band [pac, pac frightened, ghost, ghost frightened, tunnel, elroy 1, elroy 2].
  fullSpeed:75.75757625/8,eyes:16,dotStall:1/60,pelletStall:3/60,
  levelSpeeds:Object.freeze([[1,[.80,.90,.75,.50,.40,.80,.85]],[2,[.90,.95,.85,.55,.45,.90,.95]],[5,[1,1,.95,.60,.50,1,1.05]],[21,[.90,.90,.95,.60,.50,1,1.05]]].map(v=>Object.freeze([v[0],Object.freeze(v[1])]))),
  elroyDots:Object.freeze([20,30,40,40,40,50,50,50,60,60,60,80,80,80,100,100,100,100,120]),
  modeTables:Object.freeze([[1,[7,20,7,20,5,20,5]],[2,[7,20,7,20,5,1033,1/60]],[5,[5,20,5,20,5,1037,1/60]]].map(v=>Object.freeze([v[0],Object.freeze(v[1])]))),
  fright:Object.freeze([6,5,4,3,2,5,2,2,1,5,2,1,1,3,1,1,0,1,0]),flashAt:2,
  release:Object.freeze([Object.freeze({pink:0,cyan:30,orange:60}),Object.freeze({pink:0,cyan:0,orange:50}),Object.freeze({pink:0,cyan:0,orange:0})]),releaseAfterDeath:Object.freeze({pink:7,cyan:17,orange:32}),releaseIdle:Object.freeze([4,3]),
  points:Object.freeze({dot:10,pellet:50,ghosts:Object.freeze([200,400,800,1600])}),
  fruitAt:Object.freeze([70,170]),fruitTime:9.5,fruitTile:Object.freeze([14,17.5]),
  fruits:Object.freeze([['cherries',100],['strawberry',300],['orange',500],['orange',500],['apple',700],['apple',700],['grapes',1000],['grapes',1000],['rocket',2000],['rocket',2000],['bell',3000],['bell',3000],['key',5000]].map(Object.freeze)),
  corners:Object.freeze({red:Object.freeze([25,-3]),pink:Object.freeze([2,-3]),cyan:Object.freeze([27,34]),orange:Object.freeze([0,34])}),
  noUp:Object.freeze(['12,11','15,11','12,23','15,23']),cornering:.3,eatPause:1,lives:3,extraAt:10000,deathPause:2,readyPause:2,clearPause:2});
class SeededRandom{constructor(seed=1980){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const DIRS=Object.freeze({up:[0,-1],left:[-1,0],down:[0,1],right:[1,0]}),ORDER=['up','left','down','right'],OPP={up:'down',down:'up',left:'right',right:'left'};
const COLS=CONFIG.cols,ROWS=CONFIG.rows,wrapX=x=>(x%COLS+COLS)%COLS;
const cell=(x,y)=>{if(y<0||y>=ROWS)return '#';return MAZE[y][wrapX(x)]};
const open=(x,y,door=false)=>{const c=cell(x,y);return c!=='#'&&(c!=='-'||door)};
class PacEngine{
 constructor(seed=1980){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=CONFIG.lives;this.extraGiven=false;this.level=0;this.newLevel();return this}
 newLevel(){this.level++;this.dots=new Set();this.pellets=new Set();for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){if(MAZE[y][x]==='.')this.dots.add(x+','+y);if(MAZE[y][x]==='o')this.pellets.add(x+','+y)}
  this.eaten=0;this.fruit=null;this.fruitsShown=0;this.afterDeath=false;this.startRound();this.events.push({type:'level',level:this.level})}
 startRound(){const [px,py]=CONFIG.pacStart;this.pac={x:px,y:py,dir:'left',want:'left',open:0,cut:false};
  const [dx,dy]=CONFIG.ghostDoor;this.ghosts=[{name:'red',x:dx,y:dy,dir:'left',state:'out'},{name:'pink',x:14,y:CONFIG.houseY,dir:'up',state:'home'},{name:'cyan',x:12,y:CONFIG.houseY,dir:'up',state:'home'},{name:'orange',x:16,y:CONFIG.houseY,dir:'up',state:'home'}];
  this.modeIndex=0;this.modeTime=0;this.frightTime=0;this.freeze=0;this.stall=0;this.elroyHeld=this.afterDeath;this.combo=0;this.idle=0;this.roundDots=0;this.state='ready';this.timer=CONFIG.readyPause}
 band(T){let v=T[0][1];for(const [from,row] of T)if(this.level>=from)v=row;return v}
 modes(){return this.band(CONFIG.modeTables)}
 mode(){const M=this.modes();return this.modeIndex>=M.length?'chase':this.modeIndex%2===0?'scatter':'chase'}
 // Speeds by level band, in tiles a second: pac, pacFright, ghost, ghostFright, tunnel, elroy1, elroy2.
 speeds(){const r=this.band(CONFIG.levelSpeeds),f=CONFIG.fullSpeed;return{pac:r[0]*f,pacFright:r[1]*f,ghost:r[2]*f,ghostFright:r[3]*f,tunnel:r[4]*f,elroy1:r[5]*f,elroy2:r[6]*f}}
 // Cruise Elroy: red speeds up when few dots are left (held back after a lost life until orange is out).
 elroy(){const left=this.dots.size+this.pellets.size,n=CONFIG.elroyDots[Math.min(this.level,CONFIG.elroyDots.length)-1];if(this.elroyHeld)return 0;return left<=n/2?2:left<=n?1:0}
 frightLen(){return CONFIG.fright[Math.min(this.level-1,CONFIG.fright.length-1)]}
 // Positions are in tiles; tile (i, j) has its centre at (i + .5, j + .5). Turns happen only at tile centres.
 tx(e){return Math.floor(e.x)}
 ty(e){return Math.floor(e.y)}
 atCentre(e){return Math.abs(e.x-Math.floor(e.x)-.5)<1e-6&&Math.abs(e.y-Math.floor(e.y)-.5)<1e-6}
 travel(e,dist,decide,door=false){let guard=0;while(dist>1e-9&&guard++<64){
   if(this.atCentre(e)){decide(e);const [nx,ny]=DIRS[e.dir];if(!open(this.tx(e)+nx,this.ty(e)+ny,door)){e.stopped=true;return}}
   e.stopped=false;const [dx,dy]=DIRS[e.dir],c=dx?e.x:e.y,s=dx||dy,next=s>0?Math.floor(c-.5)+1.5:Math.ceil(c-.5)-.5,to=Math.abs(next-c),d=Math.min(dist,to);
   if(dx)e.x+=dx*d;else e.y+=dy*d;dist-=d;if(d>=to-1e-9){if(dx)e.x=next;else e.y=next}
   if(e.x<0)e.x+=COLS;else if(e.x>=COLS)e.x-=COLS}}
 // Ghost target tiles.
 target(gh){const p=this.pac,[px,py]=[this.tx(p),this.ty(p)],[dx,dy]=DIRS[p.dir];
  if(this.mode()==='scatter'&&!(gh.name==='red'&&this.elroy()))return CONFIG.corners[gh.name];
  if(gh.name==='red')return [px,py];
  // Facing up, the cabinet's offset also runs as many tiles to the left.
  const up=p.dir==='up';
  if(gh.name==='pink')return [px+dx*4-(up?4:0),py+dy*4];
  if(gh.name==='cyan'){const r=this.ghosts[0],ax=px+dx*2-(up?2:0),ay=py+dy*2;return [ax*2-this.tx(r),ay*2-this.ty(r)]}
  const d=Math.hypot(px-this.tx(gh),py-this.ty(gh));return d>8?[px,py]:CONFIG.corners.orange}
 choose(gh,target){const x=this.tx(gh),y=this.ty(gh);let best=null,bd=1e9;
  for(const d of ORDER){if(d===OPP[gh.dir])continue;if(d==='up'&&CONFIG.noUp.includes(x+','+y)&&gh.state==='out'&&!this.frightened(gh))continue;const [dx,dy]=DIRS[d];if(!open(x+dx,y+dy))continue;
   if(!target){continue}const dd=(x+dx-target[0])**2+(y+dy-target[1])**2;if(dd<bd){bd=dd;best=d}}
  if(!target){const opts=ORDER.filter(d=>d!==OPP[gh.dir]&&open(x+DIRS[d][0],y+DIRS[d][1]));best=opts.length?opts[Math.floor(this.rng.next()*opts.length)]:OPP[gh.dir]}
  gh.dir=best||OPP[gh.dir]}
 frightened(gh){return gh.fright&&this.frightTime>0}
 reverseAll(){for(const gh of this.ghosts)if(gh.state==='out')gh.dir=OPP[gh.dir]}
 eat(key,pellet){(pellet?this.pellets:this.dots).delete(key);this.eaten++;this.roundDots++;this.idle=0;this.award(pellet?CONFIG.points.pellet:CONFIG.points.dot);this.events.push({type:pellet?'pellet':'dot'});
  this.stall=pellet?CONFIG.pelletStall:CONFIG.dotStall;
  if(pellet){const t=this.frightLen();this.combo=0;this.reverseAll();if(t>0){this.frightTime=t;for(const gh of this.ghosts)if(gh.state!=='eyes')gh.fright=true}}
  if(CONFIG.fruitAt.includes(this.eaten)){const f=CONFIG.fruits[Math.min(this.level-1,CONFIG.fruits.length-1)];this.fruit={kind:f[0],points:f[1],time:CONFIG.fruitTime};this.events.push({type:'fruit',kind:f[0]})}
  if(!this.dots.size&&!this.pellets.size){this.state='cleared';this.timer=CONFIG.clearPause;this.events.push({type:'cleared',level:this.level})}}
 award(n){this.score+=n;if(!this.extraGiven&&this.score>=CONFIG.extraAt){this.extraGiven=true;this.lives++;this.events.push({type:'extra'})}}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  if(this.state==='ready'||this.state==='dying'||this.state==='cleared'){this.timer-=dt;if(this.timer>0)return;
   if(this.state==='cleared'){this.newLevel();return}if(this.state==='dying'){if(this.lives<=0){this.state='end';this.events.push({type:'gameover',score:this.score});return}this.afterDeath=true;this.startRound();return}this.state='play'}
  if(this.state!=='play')return;
  // Eating a ghost stops the action for a moment while its points show, as on the cabinet.
  if(this.freeze>0){this.freeze-=dt;return}
  // Modes and fright timers.
  if(this.frightTime>0){this.frightTime-=dt;if(this.frightTime<=0){this.frightTime=0;for(const gh of this.ghosts)gh.fright=false}}
  else if(this.modeIndex<this.modes().length){this.modeTime+=dt;if(this.modeTime>=this.modes()[this.modeIndex]-1e-9){this.modeTime=0;this.modeIndex++;this.reverseAll();this.events.push({type:'mode',mode:this.mode()})}}
  // Snack-man.
  const p=this.pac,want=input.dir;if(want)p.want=want;
  const S=this.speeds(),ps=(this.frightTime>0?S.pacFright:S.pac)*dt;
  if(this.stall>0){this.stall-=dt}else{
  if(p.want===OPP[p.dir])p.dir=p.want;
  // Cornering, as on the cabinet: a turn asked for up to a third of a tile before or after a tile centre is taken at
  // once; the player then moves diagonally, back onto the new line while running down it.
  else if(p.want!==p.dir&&!p.cut){const [dx,dy]=DIRS[p.dir],c=dx?p.x:p.y,off=(c-Math.floor(c)-.5)*(dx||dy),[wx,wy]=DIRS[p.want];
   if(off!==0&&Math.abs(off)<CONFIG.cornering&&open(this.tx(p)+wx,this.ty(p)+wy)){p.dir=p.want;p.cut=true}}
  if(p.cut){const [dx]=DIRS[p.dir],k=dx?'y':'x',ctr=Math.floor(p[k])+.5,d=ctr-p[k],m=Math.min(Math.abs(d),ps);p[k]+=Math.sign(d)*m;if(Math.abs(ctr-p[k])<1e-9){p[k]=ctr;p.cut=false}}
  this.travel(p,ps,e=>{const [wx,wy]=DIRS[e.want];if(open(this.tx(e)+wx,this.ty(e)+wy))e.dir=e.want});
  if(!p.stopped)p.open+=dt}
  const key=this.tx(p)+','+this.ty(p);if(Math.abs(p.x-Math.floor(p.x)-.5)<.3&&Math.abs(p.y-this.ty(p)-.5)<.3){if(this.dots.has(key))this.eat(key,false);else if(this.pellets.has(key))this.eat(key,true)}
  if(this.state!=='play')return;
  if(this.fruit){this.fruit.time-=dt;if(this.fruit.time<=0)this.fruit=null;else if(Math.abs(p.x-CONFIG.fruitTile[0])<.6&&Math.abs(p.y-CONFIG.fruitTile[1])<.6){this.award(this.fruit.points);this.events.push({type:'fruit-eaten',kind:this.fruit.kind,points:this.fruit.points});this.fruit=null}}
  // Ghost house releases.
  this.idle+=dt;const idleMax=CONFIG.releaseIdle[this.level>=5?1:0];for(const gh of this.ghosts){if(gh.state!=='home')continue;const need=(this.afterDeath?CONFIG.releaseAfterDeath:CONFIG.release[Math.min(this.level,3)-1])[gh.name];if(this.roundDots>=need||this.idle>=idleMax){gh.state='leaving';this.idle=0;if(gh.name==='orange')this.elroyHeld=false;break}}
  // Ghosts.
  for(const gh of this.ghosts){
   if(gh.state==='home'){gh.y=CONFIG.houseY+Math.sin(this.clock*6+gh.x)*.25;continue}
   if(gh.state==='leaving'||gh.state==='entering'){const sp=S.ghost*.6*dt,[dx,dy]=CONFIG.ghostDoor;
    if(gh.state==='leaving'){if(Math.abs(gh.x-dx)>sp)gh.x+=Math.sign(dx-gh.x)*sp;else{gh.x=dx;if(gh.y>dy+sp)gh.y-=sp;else{gh.y=dy;gh.state='out';gh.dir='left';gh.fright=gh.fright&&this.frightTime>0}}}
    else if(Math.abs(gh.x-dx)>sp)gh.x+=Math.sign(dx-gh.x)*sp;else{gh.x=dx;if(gh.y<CONFIG.houseY-sp)gh.y+=sp;else{gh.y=CONFIG.houseY;gh.state='leaving';gh.fright=false}}continue}
   const tunnel=this.ty(gh)===14&&(gh.x<6||gh.x>22);
   const el=gh.name==='red'?this.elroy():0,v=gh.state==='eyes'?CONFIG.eyes:this.frightened(gh)?S.ghostFright:tunnel?S.tunnel:el===2?S.elroy2:el===1?S.elroy1:S.ghost;
   this.travel(gh,v*dt,e=>{if(e.state==='eyes'){if(this.tx(e)===13&&this.ty(e)===11){e.state='entering';return}this.choose(e,[13,11])}else this.choose(e,this.frightened(e)?null:this.target(e))})}
  // Collisions.
  for(const gh of this.ghosts){if(gh.state!=='out')continue;if(Math.abs(gh.x-p.x)<.6&&Math.abs(gh.y-p.y)<.6){
    if(this.frightened(gh)){const pts=CONFIG.points.ghosts[Math.min(this.combo,3)];this.combo++;this.award(pts);gh.state='eyes';gh.fright=false;this.freeze=CONFIG.eatPause;this.events.push({type:'ghost-eaten',points:pts,x:gh.x,y:gh.y});return}
    else{this.lives--;this.state='dying';this.timer=CONFIG.deathPause;this.events.push({type:'death',lives:this.lives});return}}}}
 // Demo pilot: predicts each hunting ghost's next tiles by its own targeting rule and heads for the nearest dot along
 // tiles it reaches well apart in time from any ghost; with none it takes the step that keeps furthest from them.
 ghostPath(gh,n,v){const out=[];let x=gh.state==='out'?this.tx(gh):CONFIG.ghostDoor[0],y=gh.state==='out'?this.ty(gh):Math.floor(CONFIG.ghostDoor[1]),d=gh.state==='out'?gh.dir:'left';
  const frac=gh.state==='out'?Math.abs((DIRS[d][0]?gh.x:gh.y)%1-.5):0,t0=gh.state==='out'?0:(gh.state==='home'?2:.6);out.push([x+','+y,t0]);
  const tg=this.target(gh);for(let i=1;i<=n;i++){let best=null,bd=1e9;for(const o of ORDER){if(o===OPP[d])continue;const nx=wrapX(x+DIRS[o][0]),ny=y+DIRS[o][1];if(!open(nx,ny))continue;const dd=(nx-tg[0])**2+(ny-tg[1])**2;if(dd<bd){bd=dd;best=o}}
   if(!best)break;d=best;x=wrapX(x+DIRS[d][0]);y+=DIRS[d][1];out.push([x+','+y,t0+(i-frac)/v])}return out}
 pilot(){const p=this.pac,S=this.speeds(),key=(x,y)=>x+','+y,threat=new Map();
  for(const gh of this.ghosts){if(this.frightened(gh)||gh.state==='eyes'||gh.state==='entering')continue;const v=gh.name==='red'&&this.elroy()?S.elroy2:S.ghost;
   for(const [k,t] of this.ghostPath(gh,16,v)){if(!threat.has(k))threat.set(k,[]);threat.get(k).push(t)}
   if(gh.state==='out'){const gx=this.tx(gh),gy=this.ty(gh);for(const o of ORDER){const k=key(wrapX(gx+DIRS[o][0]),gy+DIRS[o][1]);if(!threat.has(k))threat.set(k,[]);threat.get(k).push(.05)}}}
  const pv=(this.frightTime>0?S.pacFright:S.pac)*.8,bad=(k,n)=>{const ts=threat.get(k);if(!ts)return false;const t=n/pv;return ts.some(g=>Math.abs(g-t)<.3||(g<t&&n<=2))};
  const [mx,my]=DIRS[p.dir],c=mx?p.x:p.y,off=(c-Math.floor(c)-.5)*(mx||my),ahead=off>1e-9&&open(this.tx(p)+mx,this.ty(p)+my);let sx=ahead?wrapX(this.tx(p)+mx):this.tx(p),sy=ahead?this.ty(p)+my:this.ty(p);
  if(ahead&&bad(key(sx,sy),1)){sx=this.tx(p);sy=this.ty(p)}
  const seen=new Map([[key(sx,sy),null]]),dist=new Map([[key(sx,sy),0]]),q=[[sx,sy]];let goal=null;
  while(q.length){const [x,y]=q.shift(),k=key(x,y),n=dist.get(k);if(k!==key(sx,sy)&&(this.dots.has(k)||this.pellets.has(k)||this.ghosts.some(gh=>this.frightened(gh)&&gh.state==='out'&&this.tx(gh)===x&&this.ty(gh)===y))){goal=k;break}
   for(const d of ORDER){const nx=wrapX(x+DIRS[d][0]),ny=y+DIRS[d][1],nk=key(nx,ny);if(!open(nx,ny)||seen.has(nk)||bad(nk,n+1))continue;seen.set(nk,[k,d]);dist.set(nk,n+1);q.push([nx,ny])}}
  if(!goal){let far=null,fd=-1;for(const [k,n] of dist){const ts=threat.get(k),m=ts?Math.min(...ts.map(g=>Math.abs(g-n/pv))):9+n*.01;if(m>fd){fd=m;far=k}}goal=far}
  let k=goal,first=null;while(seen.get(k)){const [pk,d]=seen.get(k);first=d;k=pk}
  if(!first){const sx0=this.tx(p),sy0=this.ty(p);let bd=p.dir,bt=-1;for(const d of ORDER){const nx=wrapX(sx0+DIRS[d][0]),ny=sy0+DIRS[d][1];if(!open(nx,ny))continue;const ts=threat.get(key(nx,ny)),t=ts?Math.min(...ts):99;if(t>bt){bt=t;bd=d}}return{dir:bd}}
  return{dir:first}}
 snapshot(){return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,lives:this.lives,level:this.level,dots:this.dots.size,pellets:this.pellets.size,mode:this.mode(),fright:+this.frightTime.toFixed(3),
  pac:[+this.pac.x.toFixed(3),+this.pac.y.toFixed(3),this.pac.dir],ghosts:this.ghosts.map(gh=>[gh.name,+gh.x.toFixed(3),+gh.y.toFixed(3),gh.dir,gh.state]),fruit:this.fruit&&this.fruit.kind}}
}
const SnackManCore={CONFIG,PacEngine,SeededRandom,open,cell,DIRS};
g.SnackManCore=SnackManCore;if(typeof module!=='undefined')module.exports=SnackManCore;
})(globalThis);
