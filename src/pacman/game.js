'use strict';
// Snack-Man play page: runs SnackManCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over her ruled paper: the school halls as a ballpoint maze lined with lockers, quarters to collect, pizza
// for power pellets, her walking the halls, the principal and three administrators as the ghosts with the principal's
// office for their pen, and lunch-box bonus foods (owner 2026-10-28; school-halls sheet, pacman-fruit).
(function(g){
const ID='snack-man',C=SnackManCore.CONFIG,W=C.width,H=C.height,INK=0x22355a,WALL=0x2747a8,T=24,SPR=34,OX=(W-C.cols*T)/2,OY=10;
const art={'pac-open':"@@asset:assets/pacman/pac-open.webp@@",'pac-shut':"@@asset:assets/pacman/pac-shut.webp@@",'ghost-red':"@@asset:assets/pacman/ghost-red.webp@@",'ghost-pink':"@@asset:assets/pacman/ghost-pink.webp@@",
 'ghost-cyan':"@@asset:assets/pacman/ghost-cyan.webp@@",'ghost-orange':"@@asset:assets/pacman/ghost-orange.webp@@",fright:"@@asset:assets/pacman/fright.webp@@",'fright-white':"@@asset:assets/pacman/fright-white.webp@@",
 eyes:"@@asset:assets/pacman/eyes.webp@@",pizza:"@@asset:assets/pacman/pizza.webp@@",cherries:"@@asset:assets/pacman/cherries.webp@@",strawberry:"@@asset:assets/pacman/strawberry.webp@@",
 orange:"@@asset:assets/pacman/orange.webp@@",apple:"@@asset:assets/pacman/apple.webp@@",grapes:"@@asset:assets/pacman/grapes.webp@@",rocket:"@@asset:assets/pacman/rocket.webp@@",bell:"@@asset:assets/pacman/bell.webp@@",key:"@@asset:assets/pacman/key.webp@@"};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS={up:['ArrowUp','w','W'],down:['ArrowDown','s','S'],left:['ArrowLeft','a','A'],right:['ArrowRight','d','D']};
const px=x=>OX+x*T,py=y=>OY+y*T;
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: the alternating dot chomp, the pellet siren, eating a ghost, the fruit, and the death spiral.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.flip=false;this.siren=0}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('snack-man',e))return;
  if(e.type==='dot'){this.flip=!this.flip;b.tone(this.flip?330:260,.06,.04,'triangle')}
  else if(e.type==='pellet')b.tone(180,.2,.05,'square');
  else if(e.type==='ghost-eaten')for(let i=0;i<4;i++)b.tone(400+i*200,.05,.05,'square',i*.05);
  else if(e.type==='fruit-eaten')for(let i=0;i<3;i++)b.tone(900,.06,.04,'square',i*.08);
  else if(e.type==='death')for(let i=0;i<8;i++)b.tone(700-i*70,.12,.05,'sawtooth',i*.12);
  else if(e.type==='extra')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09);
  // A short start-up tune while the first maze waits on ready (our own notes, not the cabinet's melody).
  else if(e.type==='level'&&e.level===1)[392,523,659,784,659,784,1047].forEach((f,i)=>b.tone(f,.13,.035,'square',i*.15))}
 // The siren; while eaten ghosts' eyes head home it turns into a quick high warble.
 loop(engine,dt){if(!this.on()||engine.state!=='play')return;const eyes=engine.ghosts.some(g=>g.state==='eyes'||g.state==='entering');this.siren-=dt;if(this.siren<=0){this.siren=eyes?.1:.28;this.flip2=!this.flip2;this.bus.gameTone('snack-man','siren-voice',eyes?(this.flip2?1200:900):engine.frightTime>0?(this.flip2?220:180):(this.flip2?520:440),eyes?.09:.25,.012,'sine')}}
}

class PacGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held=[];this.pad={};this.popups=[];this.sounds=new Sounds(services)}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const [k,v] of Object.entries(art))this.tex[k]=await texture(P,v);
  // School halls (owner 2026-10-28): every wall block is a bank of lockers, the ghost pen the principal's office.
  const lockers=new P.Graphics(),office=(x,y)=>x>=10&&x<=17&&y>=12&&y<=16,isW=(x,y)=>SnackManCore.cell(x,y)==='#'&&x>=0&&x<C.cols;
  lockers.rect(px(11),py(13),T*6,T*3).fill({color:0xc9a06a,alpha:.45});for(let i=1;i<6;i++)lockers.moveTo(px(11+i),py(13)).lineTo(px(11+i),py(16));lockers.stroke({width:1,color:0x8a6a40,alpha:.4});
  for(let y=0;y<C.rows;y++)for(let x=0;x<C.cols;x++){if(!isW(x,y))continue;const x0=px(x)+(isW(x-1,y)?0:5),x1=px(x)+T-(isW(x+1,y)?0:5),y0=py(y)+(isW(x,y-1)?0:5),y1=py(y)+T-(isW(x,y+1)?0:5);
   lockers.rect(x0,y0,x1-x0,y1-y0).fill({color:office(x,y)?0xa77a48:0x9fb4cc,alpha:office(x,y)?.5:.42})}
  for(let y=0;y<C.rows;y++)for(let x=0;x<C.cols;x++){if(!isW(x,y)||office(x,y))continue;const h=isW(x-1,y)||isW(x+1,y);
   // a seam between neighbouring lockers and three vent slots near the top of each door
   if(h&&isW(x-1,y))lockers.moveTo(px(x),py(y)+6).lineTo(px(x),py(y)+T-6);if(!h&&isW(x,y-1))lockers.moveTo(px(x)+6,py(y)).lineTo(px(x)+T-6,py(y));
   const cx=px(x)+T/2,cy=py(y)+T/2;for(let k=-1;k<=1;k++)lockers.moveTo(cx-4,cy-5+k*2.4).lineTo(cx+4,cy-5+k*2.4)}
  lockers.stroke({width:1,color:0x52667f,alpha:.55});app.stage.addChild(lockers);
  // The maze: ballpoint lines along every wall edge that faces a corridor, slightly wobbly, drawn once.
  const walls=new P.Graphics(),isWall=(x,y)=>SnackManCore.cell(x,y)==='#'&&x>=0&&x<C.cols,inset=5,wob=(a,b)=>Math.sin(a*1.7+b*2.3)*.6;
  for(let y=0;y<C.rows;y++)for(let x=0;x<C.cols;x++){if(!isWall(x,y))continue;const x0=px(x),y0=py(y),x1=x0+T,y1=y0+T;
   if(y>0&&!isWall(x,y-1)&&SnackManCore.cell(x,y-1)!=='-')walls.moveTo(x0+(isWall(x-1,y)?0:inset),y0+inset+wob(x,y)).lineTo(x1-(isWall(x+1,y)?0:inset),y0+inset+wob(x+1,y));
   if(y<C.rows-1&&!isWall(x,y+1))walls.moveTo(x0+(isWall(x-1,y)?0:inset),y1-inset+wob(x,y+1)).lineTo(x1-(isWall(x+1,y)?0:inset),y1-inset+wob(x+1,y+1));
   if(x>0&&!isWall(x-1,y))walls.moveTo(x0+inset+wob(x,y),y0+(isWall(x,y-1)?0:inset)).lineTo(x0+inset+wob(x,y+1),y1-(isWall(x,y+1)?0:inset));
   if(x<C.cols-1&&!isWall(x+1,y))walls.moveTo(x1-inset+wob(x+1,y),y0+(isWall(x,y-1)?0:inset)).lineTo(x1-inset+wob(x+1,y+1),y1-(isWall(x,y+1)?0:inset))}
  // The outer border is a double wall as on the cabinet: its outside edge is drawn too, so the top and bottom have no gaps
  // where a wall stub meets them (the side tunnels stay open).
  for(let x=0;x<C.cols;x++){const x0=px(x),x1=x0+T;if(isWall(x,0))walls.moveTo(x0+(isWall(x-1,0)?0:inset),py(0)+inset+wob(x,0)).lineTo(x1-(isWall(x+1,0)?0:inset),py(0)+inset+wob(x+1,0));
   const yb=C.rows-1;if(isWall(x,yb))walls.moveTo(x0+(isWall(x-1,yb)?0:inset),py(yb)+T-inset+wob(x,yb+1)).lineTo(x1-(isWall(x+1,yb)?0:inset),py(yb)+T-inset+wob(x+1,yb+1))}
  for(let y=0;y<C.rows;y++){if(y>9&&y<19)continue;const y0=py(y),y1=y0+T,a=y>0&&isWall(0,y-1),b=y<C.rows-1&&isWall(0,y+1);
   for(const [x,edge] of [[0,px(0)+inset],[C.cols-1,px(C.cols)-inset]])if(isWall(x,y))walls.moveTo(edge+wob(x,y),y0+(a?0:inset)).lineTo(edge+wob(x,y+1),y1-(b?0:inset))}
  walls.stroke({width:2.6,color:WALL,alpha:.9,cap:'round'});
  const door=new P.Graphics().moveTo(px(13),py(12)+T/2).lineTo(px(15),py(12)+T/2).stroke({width:5,color:0x7a5230});// the office door
 app.stage.addChild(walls,door);this.walls=walls;this.door=door;
  this.dotLayer=new P.Graphics();app.stage.addChild(this.dotLayer);this.dotKey='';
  this.pelletLayer=new P.Container();app.stage.addChild(this.pelletLayer);
  const sprite=(t,size)=>{const s=new P.Sprite(this.tex[t]);s.anchor.set(.5);s.scale.set(size/Math.max(s.texture.width,s.texture.height));app.stage.addChild(s);return s};
  // Snack-man and the ghosts are drawn about one and a half tiles wide, as on the cabinet, so they fill the corridors.
  this.fruit=sprite('cherries',30);this.pac=sprite('pac-open',SPR);this.ghostSprites=['red','pink','cyan','orange'].map(n=>sprite('ghost-'+n,SPR));
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'});
  this.hud=new P.Container();app.stage.addChild(this.hud);
  const text=(size,ax=.5,ay=0)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,ay);this.hud.addChild(t);return t};
  this.scoreLabel=text(22,.5);this.scoreText=text(52,.5);this.bestText=text(22,.5);this.levelText=text(22,.5);this.popText=text(22,.5,.5);this.message=text(52,.5,.5);this.sub=text(30,.5,.5);
  this.scoreLabel.text='score';this.lifeIcons=new P.Container();this.fruitIcons=new P.Container();app.stage.addChild(this.lifeIcons,this.fruitIcons);
  this.onKey=e=>this.key(e,true);this.offKey=e=>this.key(e,false);addEventListener('keydown',this.onKey);addEventListener('keyup',this.offKey);this.touch=g.No2TouchPad?.(this,app.canvas,W,H)||{fingers:new Map(),stick:()=>({x:0,y:0,d:0}),dir4:()=>null,take:k=>k==='twos'?0:[]};this.onBlur=()=>{this.held=[]};addEventListener('blur',this.onBlur);
  this.tracing=await g.No2Tracing?.attach(P,app,this.hud,{quiet:[this.message,this.sub]});this.newGame(this.seed);app.ticker.add(t=>this.frame(t.deltaMS/1000));return this}
 inputEnabled(){return !g.No2||g.No2.gameInputEnabled?.()!==false}
 // A key let go while a dialog has the input still counts as let go, so nothing stays held after it closes.
 key(e,down){if(!this.inputEnabled()){if(!down)this.held=[];return}const k=e.key;
  // Initials: letters typed on the keyboard go straight in (owner 2026-10-25), so no letter moves or pauses here.
  if(this.mode==='initials'){if(down){e.preventDefault();if(!e.repeat||k.startsWith('Arrow'))this.edge(k)}return}
  if(down&&(k==='p'||k==='P')){this.pause();e.preventDefault();return}
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){e.preventDefault();this.held=this.held.filter(n=>n!==name);if(down)this.held.push(name)}
  if(down&&!e.repeat)this.edge(k)}
 edge(k){if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller: stick or D-pad steers, like the cabinet's four-way joystick; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0;
   now.dir=b(12)?'up':b(13)?'down':b(14)?'left':b(15)?'right':Math.max(Math.abs(x),Math.abs(y))<.45?null:Math.abs(x)>Math.abs(y)?(x>0?'right':'left'):(y>0?'down':'up');now.a=b(0);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.dir==='up'&&this.pad.dir!=='up')this.edge('ArrowUp');if(now.dir==='down'&&this.pad.dir!=='down')this.edge('ArrowDown');if(now.a&&!this.pad.a)this.edge(' ')}
  this.pad=now}
 // Touch: drag or swipe the way to go; like the stick, the last way pushed is kept for the next turn.
 input(){const T=this.touch,sw=T.take('swipes').pop();return{dir:this.held[this.held.length-1]||this.pad.dir||T.dir4(T.stick())||(sw?T.dir4({x:sw.dx,y:sw.dy}):null)}}
 newGame(seed=this.seed){this.seed=seed;this.engine=new SnackManCore.PacEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,SnackManCore)||null;this.paused=false;this.popups=[];this.dotKey='';if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);if(this.engine.state==='end')this.endGame()}
  for(const p of this.popups)p.life-=dt;this.popups=this.popups.filter(p=>p.life>0);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(ev.type==='ghost-eaten')this.popups.push({text:String(ev.points),x:ev.x,y:ev.y,life:1});
   if(ev.type==='fruit-eaten')this.popups.push({text:String(ev.points),x:C.fruitTile[0],y:C.fruitTile[1],life:1.5});
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 icon(container,t,n,x,y,size,dx){const P=this.P;while(container.children.length>n)container.removeChildAt(container.children.length-1).destroy();while(container.children.length<n){const s=new P.Sprite(this.tex[t]);s.anchor.set(.5);container.addChild(s)}
  container.children.forEach((s,i)=>{s.texture=this.tex[Array.isArray(t)?t[i]:t];s.scale.set(size/Math.max(s.texture.width,s.texture.height));s.position.set(x+i*dx,y)})}
 render(){const e=this.engine,TX=this.tex;
  // A cleared maze blinks before the next level, as on the cabinet.
  this.walls.alpha=e.state==='cleared'&&e.timer<C.clearPause-.5&&Math.floor(e.timer*5)%2?.25:1;
  const key=e.dots.size+'|'+e.level;if(key!==this.dotKey){this.dotKey=key;const d=this.dotLayer;d.clear();for(const k of e.dots){const [x,y]=k.split(',').map(Number);d.circle(px(x+.5),py(y+.5),3.6)}d.fill({color:0xd3d7de}).stroke({width:1.2,color:0x5d6574})}// quarters
  const pel=[...e.pellets];this.icon(this.pelletLayer,'pizza',pel.length,0,0,26,0);this.pelletLayer.children.forEach((s,i)=>{const [x,y]=pel[i].split(',').map(Number);s.position.set(px(x+.5),py(y+.5));s.visible=e.state!=='play'||Math.floor(e.clock*4)%2===0})
  const p=e.pac,dying=e.state==='dying';this.pac.texture=Math.floor(p.open*14)%2&&!dying?TX['pac-shut']:TX['pac-open'];const sz=SPR/Math.max(TX['pac-open'].width,TX['pac-open'].height);
  // She is drawn from above walking down the page (hoodie front and shoes at the bottom); she turns to face the way she goes
  // (player report 2026-10-30: she walked backwards).
  this.pac.rotation={up:Math.PI,right:-Math.PI/2,down:0,left:Math.PI/2}[p.dir]??0;this.pac.scale.set(sz,sz);
  if(dying){const k=Math.max(0,e.timer/C.deathPause);this.pac.scale.set(sz*k,sz*k);this.pac.rotation+=(1-k)*6}this.pac.position.set(px(p.x),py(p.y));
  // While a bite's points show, snack-man and the ghost he ate are hidden behind the number, as on the cabinet.
  const bite=e.freeze>0&&e.state==='play';this.pac.visible=e.state!=='end'&&!bite;
  e.ghosts.forEach((gh,i)=>{const s=this.ghostSprites[i],fr=gh.fright&&e.frightTime>0,flash=fr&&e.frightTime<C.flashAt&&Math.floor(e.clock*6)%2===0;
   s.texture=gh.state==='eyes'||gh.state==='entering'?TX.eyes:fr?(flash?TX['fright-white']:TX.fright):TX['ghost-'+gh.name];const k=(gh.state==='eyes'||gh.state==='entering'?22:SPR)/Math.max(s.texture.width,s.texture.height);
   s.scale.set(gh.dir==='left'&&!fr?-k:k,k);s.position.set(px(gh.x),py(gh.y));s.visible=!dying&&e.state!=='cleared'&&e.state!=='end'&&!(bite&&gh.state==='eyes'&&Math.abs(gh.x-p.x)+Math.abs(gh.y-p.y)<1.5)});
  this.fruit.visible=!!e.fruit;if(e.fruit){this.fruit.texture=TX[e.fruit.kind];this.fruit.scale.set(28/Math.max(this.fruit.texture.width,this.fruit.texture.height));this.fruit.position.set(px(C.fruitTile[0]),py(C.fruitTile[1]))}
  const pop=this.popups[this.popups.length-1];this.popText.text=pop?pop.text:'';if(pop)this.popText.position.set(px(pop.x),py(pop.y));
  this.scoreText.text=String(e.score).padStart(2,'0');const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';this.levelText.text='level '+e.level;
  this.icon(this.lifeIcons,'pac-open',Math.max(0,e.lives-(e.state==='play'?1:0)),W-OX/2-30,H-60,26,30);
  const fr=[];for(let l=Math.max(1,e.level-3);l<=e.level;l++)fr.push(C.fruits[Math.min(l-1,C.fruits.length-1)][0]);this.icon(this.fruitIcons,fr,fr.length,W-OX/2-45,H-110,26,30);
  const padMode=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(padMode?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='final grade.';sub=padMode?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  else if(e.state==='ready'&&!this.simPaused){msg='ready!'}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const s=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=s(52);for(const t of [this.scoreLabel,this.bestText,this.levelText,this.popText])t.style.fontSize=s(22);this.sub.style.fontSize=s(30);
  this.scoreLabel.position.set(OX/2,40);this.scoreText.position.set(OX/2,40+s(22)*1.3);this.bestText.position.set(OX/2,40+s(22)*1.3+s(52)*1.3);this.levelText.position.set(W-OX/2,40);
  this.message.position.set(px(14),py(17.5));this.sub.position.set(px(14),py(17.5)+s(52)*.9);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreLabel,this.scoreText,this.bestText,this.levelText,this.popText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class PacAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1980){if(this.api)return this.api;const frame=document.createElement('div');frame.id='pacman-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new PacGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>SnackManTests.run(SnackManCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);removeEventListener('blur',game.onBlur);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2SnackMan={Adapter:PacAdapter,Game:PacGame,art};
})(globalThis);
