'use strict';
// Robotron: Class of 2084 play page: runs RobotronCore at a fixed 120 Hz and draws it with PixiJS straight onto the host
// page (no iframe), over her college-ruled paper with a gym floor inked on it. School as The Wall (owner 2026-10-28): she
// flicks rubber bands; marching identical punks are the Grunts, a football player the Hulk (owner 2026-10-30, player feedback), the principal the
// Brain turning classmates into faceless students (Progs) with detention-slip planes, hall monitors on rolling podiums the
// Enforcers (thrown books), bullies hurling cafeteria platters the Tanks, tumbling backpacks and hall passes their spawners,
// textbook stacks the Electrodes; June, Theo and a younger student to rescue (school-themes sheets, batch RW).
(function(g){
const ID='class-of-2084',C=RobotronCore.CONFIG,W=C.width,H=C.height,INK=0x22355a;
const names=['hero-a','hero-b','mommy-a','mommy-b','daddy-a','daddy-b','mikey-a','mikey-b','prog-a','prog-b','glasses','burst','paper','spark','plane','bouncy','grunt-a','grunt-b','hulk-a','hulk-b','brain-a','brain-b','lamp-a','lamp-b','ball-a','ball-b','drone-a','drone-b','jack-a','jack-b','tank-a','tank-b'];
const art={"hero-a":"@@asset:assets/robotron/hero-a.webp@@","hero-b":"@@asset:assets/robotron/hero-b.webp@@","mommy-a":"@@asset:assets/robotron/mommy-a.webp@@","mommy-b":"@@asset:assets/robotron/mommy-b.webp@@","daddy-a":"@@asset:assets/robotron/daddy-a.webp@@","daddy-b":"@@asset:assets/robotron/daddy-b.webp@@","mikey-a":"@@asset:assets/robotron/mikey-a.webp@@","mikey-b":"@@asset:assets/robotron/mikey-b.webp@@","prog-a":"@@asset:assets/robotron/prog-a.webp@@","prog-b":"@@asset:assets/robotron/prog-b.webp@@",glasses:"@@asset:assets/robotron/glasses.webp@@",burst:"@@asset:assets/robotron/burst.webp@@",paper:"@@asset:assets/robotron/paper.webp@@",spark:"@@asset:assets/robotron/spark.webp@@",plane:"@@asset:assets/robotron/plane.webp@@",bouncy:"@@asset:assets/robotron/bouncy.webp@@","grunt-a":"@@asset:assets/robotron/grunt-a.webp@@","grunt-b":"@@asset:assets/robotron/grunt-b.webp@@","hulk-a":"@@asset:assets/robotron/hulk-a.webp@@","hulk-b":"@@asset:assets/robotron/hulk-b.webp@@","brain-a":"@@asset:assets/robotron/brain-a.webp@@","brain-b":"@@asset:assets/robotron/brain-b.webp@@","lamp-a":"@@asset:assets/robotron/lamp-a.webp@@","lamp-b":"@@asset:assets/robotron/lamp-b.webp@@","ball-a":"@@asset:assets/robotron/ball-a.webp@@","ball-b":"@@asset:assets/robotron/ball-b.webp@@","drone-a":"@@asset:assets/robotron/drone-a.webp@@","drone-b":"@@asset:assets/robotron/drone-b.webp@@","jack-a":"@@asset:assets/robotron/jack-a.webp@@","jack-b":"@@asset:assets/robotron/jack-b.webp@@","tank-a":"@@asset:assets/robotron/tank-a.webp@@","tank-b":"@@asset:assets/robotron/tank-b.webp@@"};
// Sprite and on-page height for each kind; the people all stand the same height. The cabinet's family as the field
// trip: Mommy the girl in the red coat with the blue balloon, Daddy the girl in purple overalls with the grey bunny,
// Mikey the boy in the green dinosaur hoodie.
// Every enemy stands a little taller than her (owner 2026-10-28: intimidating); she is 52.
const LOOK={grunt:['grunt',60],hulk:['hulk',84],electrode:['lamp',44],spheroid:['ball',36],enforcer:['drone',54],brain:['brain',64],prog:['prog',58],quark:['jack',42],tank:['tank',64],
 mommy:['mommy',40],daddy:['daddy',36],mikey:['mikey',32],spark:['spark',24],missile:['plane',30],shell:['bouncy',26]};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS={left:['a','A'],right:['d','D'],up:['w','W'],down:['s','S'],fireLeft:['ArrowLeft'],fireRight:['ArrowRight'],fireUp:['ArrowUp'],fireDown:['ArrowDown']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: the shot, explosions, the rising rescue chime, the crushed human, robots warping in.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.beat=0}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('class-of-2084',e))return;
  if(e.type==='shot')b.tone(1500,.025,.012,'square');
  else if(e.type==='kill')b.noise(e.kind==='spheroid'||e.kind==='quark'||e.kind==='brain'?.25:.09,1200,.05);
  else if(e.type==='push')b.tone(120,.05,.03,'square');
  else if(e.type==='rescue')for(let i=0;i<4;i++)b.tone(660+i*220+e.points/20,.06,.03,'square',i*.05);
  else if(e.type==='humanLost')for(let i=0;i<3;i++)b.tone(300-i*70,.1,.035,'sawtooth',i*.09);
  else if(e.type==='programmed')for(let i=0;i<6;i++)b.tone(400+(i%2)*300,.05,.025,'square',i*.06);
  else if(e.type==='spawn')for(let i=0;i<4;i++)b.tone(900-i*150,.04,.02,'sine',i*.04);
  else if(e.type==='enemyShot')b.tone(e.kind==='missile'?260:e.kind==='shell'?180:700,.06,.012,'triangle');
  else if(e.type==='fizzle')b.noise(.12,2400,.03);
  else if(e.type==='death')b.noise(1,260,.1);
  else if(e.type==='wave')for(let i=0;i<8;i++)b.tone(200+i*90,.05,.02,'square',i*.05);
  else if(e.type==='extra')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09)}
 loop(engine,dt){if(!this.on()||engine.state!=='play')return;this.beat-=dt;if(this.beat<=0){this.beat=.5;if(engine.robots.some(o=>o.kind==='grunt'))this.bus.gameTone('class-of-2084','grunt-voice',90,.06,.01,'triangle')}}
}

class RobotronGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.sounds=new Sounds(services);this.puffs=[]}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const k of names)this.tex[k]=await texture(P,art[k]);
  // The gym floor in ballpoint: the arena's double border, the half line, the centre circle and the two keys.
  const court=new P.Graphics(),w=C.right-C.left,h=C.bottom-C.top,mx=(C.left+C.right)/2,my=(C.top+C.bottom)/2;
  court.rect(C.left-6,C.top-6,w+12,h+12).stroke({width:3,color:INK,alpha:.8}).rect(C.left,C.top,w,h).stroke({width:1.5,color:INK,alpha:.7});
  court.moveTo(mx,C.top).lineTo(mx,C.bottom).stroke({width:1.5,color:INK,alpha:.25}).circle(mx,my,70).stroke({width:1.5,color:INK,alpha:.25});
  for(const s of [-1,1]){const x=s<0?C.left:C.right;court.rect(s<0?x:x-150,my-80,150,160).stroke({width:1.5,color:INK,alpha:.22}).moveTo(x-s*150,my+(s<0?-80:80)).arc(x-s*150,my,80,s<0?-Math.PI/2:Math.PI/2,s<0?Math.PI/2:Math.PI*1.5).stroke({width:1.5,color:INK,alpha:.22});
   court.moveTo(x,my+(s<0?-250:250)).arc(x,my,250,s<0?-Math.PI/2:Math.PI/2,s<0?Math.PI/2:Math.PI*1.5).stroke({width:1.5,color:INK,alpha:.18})}
  app.stage.addChild(court);
  const layer=()=>{const c=new P.Container();app.stage.addChild(c);return c};
  this.markLayer=layer();this.humanLayer=layer();this.robotLayer=layer();this.shotLayer=layer();this.bulletLayer=layer();
  this.player=new P.Sprite(this.tex['hero-a']);this.player.anchor.set(.5,.6);app.stage.addChild(this.player);this.heroK=52/this.tex['hero-a'].height;
  this.fxLayer=layer();
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'});
  this.hud=layer();const text=(size,ax=.5,ay=0)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,ay);this.hud.addChild(t);return t};
  this.scoreText=text(52,0);this.livesText=text(22,1);this.bestText=text(22);this.pointsText=text(22);this.message=text(52,.5,.5);this.sub=text(30,.5,.5);
  this.onKey=e=>this.key(e,true);this.offKey=e=>this.key(e,false);addEventListener('keydown',this.onKey);addEventListener('keyup',this.offKey);this.touch=g.No2TouchPad?.(this,app.canvas,W,H)||{fingers:new Map(),stick:()=>({x:0,y:0,d:0}),dir4:()=>null,take:k=>k==='twos'?0:[]};
  this.tracing=await g.No2Tracing?.attach(P,app,this.hud,{quiet:[this.message,this.sub]});this.newGame(this.seed);app.ticker.add(t=>this.frame(t.deltaMS/1000));return this}
 inputEnabled(){return !g.No2||g.No2.gameInputEnabled?.()!==false}
 key(e,down){if(!this.inputEnabled())return;const k=e.key;
  // Initials: letters typed on the keyboard go straight in (owner 2026-10-25), so no letter moves or pauses here.
  if(this.mode==='initials'){if(down){e.preventDefault();if(!e.repeat||k.startsWith('Arrow'))this.edge(k)}return}
  if(down&&(k==='p'||k==='P')){this.pause();e.preventDefault();return}
  // A fire tap shorter than a frame still throws once: it is kept for the next step.
  // Walking keys by where they sit on the keyboard (2026-10-30, languages): W A S D on QWERTY are Z Q S D on AZERTY.
  const pos={KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d'}[e.code],kk=pos||k;
  for(const [name,list] of Object.entries(KEYS))if(list.includes(kk)){this.held[name]=down;if(down&&!e.repeat&&name.startsWith('fire'))this.tapFire={x:name==='fireRight'?1:name==='fireLeft'?-1:0,y:name==='fireDown'?1:name==='fireUp'?-1:0};e.preventDefault()}
  if(down&&!e.repeat)this.edge(k)}
 edge(k){if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller, like the cabinet's two sticks: the left stick or D-pad moves, the right stick fires; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,y=p.axes[1]||0,dz=v=>Math.abs(v)<.25?0:Math.sign(v)*Math.min(1,(Math.abs(v)-.25)/.65);
   now.axis=dz(p.axes[0]||0);now.axisY=dz(y);now.aimX=dz(p.axes[2]||0);now.aimY=dz(p.axes[3]||0);now.left=b(14);now.right=b(15);now.up=b(12)||y<-.5;now.down=b(13)||y>.5;now.dup=b(12);now.ddown=b(13);now.a=b(0);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.a&&!this.pad.a)this.edge(' ')}
  this.pad=now}
 // Firing counts only once both fire controls have been let go since play resumed, so the key or stick that starts the page does not shoot.
 // Touch, two sticks: a finger on the left half walks; a finger on the right half fires along its drag, or toward
 // where it rests when held still; a tap there fires one shot toward the spot.
 touchAim(){const T=this.touch,p=this.engine.player,to=(x,y)=>{const d=Math.hypot(x,y);return d>4?{x:x/d,y:y/d}:null};for(const t of T.take('taps'))if(t.x>=W/2)this.tapFire=to(t.x-p.x,t.y-p.y)||this.tapFire;
  const f=T.stick(f=>f.x0>=W/2).f;return f?(f.moved?to(f.x-f.x0,f.y-f.y0):to(f.x-p.x,f.y-p.y)):null}
 input(){const pad=this.pad,h=this.held,aim=this.touchAim(),ms=this.touch.stick(f=>f.x0<W/2),tap=this.tapFire||aim,aiming=!!(h.fireLeft||h.fireRight||h.fireUp||h.fireDown||pad.aimX||pad.aimY||tap);this.tapFire=null;if(!aiming)this.fireArmed=true;const ok=this.fireArmed;
  const kx=(h.right||pad.right?1:0)-(h.left||pad.left?1:0),ky=(h.down||pad.ddown?1:0)-(h.up||pad.dup?1:0),held=h.fireRight||h.fireLeft||h.fireUp||h.fireDown,fx=held?(h.fireRight?1:0)-(h.fireLeft?1:0):tap?tap.x:0,fy=held?(h.fireDown?1:0)-(h.fireUp?1:0):tap?tap.y:0;
  return{axis:kx||pad.axis||ms.x,axisY:ky||pad.axisY||ms.y,aimX:ok?fx||pad.aimX||0:0,aimY:ok?fy||pad.aimY||0:0}}
 newGame(seed=this.seed){this.seed=seed;this.endHold=0;this.engine=new RobotronCore.RobotronEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,RobotronCore)||null;this.paused=false;this.tapFire=null;this.puffs=[];if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);// The last life's burst plays out for a moment before the end screen.
   if(this.engine.state==='end'&&(this.endHold+=dt)>=C.deathPause)this.endGame()}
  for(const f of this.puffs)f.life-=dt;this.puffs=this.puffs.filter(f=>f.life>0);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(ev.type==='kill'||ev.type==='fizzle')this.puffs.push({x:ev.x,y:ev.y,life:.35,size:ev.kind==='spheroid'||ev.kind==='quark'||ev.kind==='brain'?70:44,text:ev.points>=500?String(ev.points):''});
   if(ev.type==='rescue')this.puffs.push({x:ev.x,y:ev.y,life:1,size:0,text:String(ev.points)});
   if(ev.type==='death')this.puffs.push({x:ev.x,y:ev.y,life:1.2,size:100});
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 pool(layer,list,n,t){while(list.length<n){const s=new this.P.Sprite(this.tex[t]);s.anchor.set(.5);layer.addChild(s);list.push(s)}list.forEach((s,i)=>s.visible=i<n);return list}
 // One sprite per thing: the texture's frame, a fixed height, mirrored to face the way it goes.
 put(s,base,frame,size,x,y,face=1,grow=1){const k=this.tex[base+'-'+frame]?base+'-'+frame:this.tex[base+'-a']?base+'-a':base,t=this.tex[k];if(s.texture!==t)s.texture=t;const sc=size/t.height*grow;s.scale.set(face<0?-sc:sc,sc);s.position.set(x,y);s.rotation=0;s.alpha=1}
 render(){const e=this.engine,step=Math.floor(e.clock*6)%2?'b':'a',fast=Math.floor(e.clock*12)%2?'b':'a',p=e.player;
  // Robots warp in during the short pause at the start of a wave or a life.
  const grow=e.state==='enter'?Math.max(.05,1-e.timer/C.enterTime):1;
  const ms=this.pool(this.markLayer,this.markSprites??=[],e.marks.length,'glasses');e.marks.forEach((m,i)=>{this.put(ms[i],'glasses','',26,m.x,m.y);ms[i].alpha=.8});
  const hs=this.pool(this.humanLayer,this.humanSprites??=[],e.humans.length,'mommy-a');e.humans.forEach((h,i)=>{const [b,size]=LOOK[h.who];this.put(hs[i],b,step,size,h.x,h.y-size*.1,h.vx<0?-1:1)});
  const rs=this.pool(this.robotLayer,this.robotSprites??=[],e.robots.length,'grunt-a');
  e.robots.forEach((o,i)=>{const [b,size]=LOOK[o.kind],s=rs[i];let f=step,face=1;
   if(o.kind==='grunt'){f=o.step?'b':'a';face=p.x<o.x?-1:1}else if(o.kind==='hulk'||o.kind==='tank'){face=o.vx<0?-1:1}else if(o.kind==='brain'){face=o.vx<0?-1:1}else if(o.kind==='prog'){face=p.x<o.x?-1:1}
   else if(o.kind==='electrode')f=Math.floor(e.clock*3+o.t*4)%2?'b':'a';else if(o.kind==='enforcer'||o.kind==='quark'||o.kind==='spheroid')f=fast;
   this.put(s,b,f,size,o.x,o.y,face,grow);if(o.programming)s.alpha=.4+.6*Math.abs(Math.sin(e.clock*20))});
  const ss=this.pool(this.shotLayer,this.shotSprites??=[],e.shots.length,'paper');e.shots.forEach((o,i)=>{this.put(ss[i],'paper','',15,o.x,o.y);ss[i].rotation=e.clock*20});
  const bs=this.pool(this.bulletLayer,this.bulletSprites??=[],e.bullets.length,'spark');e.bullets.forEach((o,i)=>{const [b,size]=LOOK[o.kind];this.put(bs[i],b,'',size,o.x,o.y);
   if(o.kind==='missile')bs[i].rotation=Math.atan2(o.vy,o.vx);else if(o.kind==='spark')bs[i].rotation=e.clock*9});
  const puffs=this.pool(this.fxLayer,this.puffSprites??=[],this.puffs.length,'burst');this.puffs.forEach((f,i)=>{const s=puffs[i];s.visible=f.size>0;s.position.set(f.x,f.y);s.scale.set(f.size/s.texture.width);s.alpha=Math.min(1,f.life*4)});
  // The boy faces the way he throws, or the way he walks.
  const face=(p.fx||p.mx||1)<0?-1:1,moving=p.mx||p.my;this.player.texture=this.tex[moving&&step==='b'?'hero-b':'hero-a'];this.player.scale.set(this.heroK*face,this.heroK);
  this.player.visible=e.state!=='end'&&(e.state!=='dead'||Math.floor(e.clock*10)%2===0);this.player.position.set(p.x,p.y);
  const hitText=this.puffs.find(f=>f.text);this.pointsText.text=hitText?hitText.text:'';if(hitText)this.pointsText.position.set(hitText.x,hitText.y-44);
  this.scoreText.text=String(e.score).padStart(4,'0');this.livesText.text='lives '+Math.max(0,e.lives)+'   wave '+e.wave;
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='final grade.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  else if(e.state==='cleared'){msg='photo retake.';sub=e.saved?'saved '+e.saved+(e.saved===1?' classmate':' classmates'):''}
  // Not under the ready card: its edges would peek out round the card (a stray letter by the centre).
  else if(e.state==='enter'&&e.wave===1&&e.lives===C.lives&&e.score===0&&!this.simPaused){msg='say cheese.'}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.livesText,this.bestText,this.pointsText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  // A paper-coloured edge keeps messages and points readable over the busy play field.
  for(const t of [this.message,this.sub,this.pointsText])t.style.stroke={color:0xf7f0e2,width:Math.max(3,Math.round(t.style.fontSize*.16)),join:'round'};
  this.scoreText.position.set(C.left,0);this.livesText.position.set(W-C.left,14);this.bestText.position.set(W/2,14);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.livesText,this.bestText,this.pointsText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class RobotronAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1982){if(this.api)return this.api;const frame=document.createElement('div');frame.id='robotron-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new RobotronGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>RobotronTests.run(RobotronCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.fireArmed=false;this.game.tapFire=null;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2Robotron={Adapter:RobotronAdapter,Game:RobotronGame,art};
})(globalThis);
