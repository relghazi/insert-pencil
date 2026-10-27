'use strict';
// Jock Joust play page: runs JockJoustCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over her college-ruled paper: her jock on the school eagle against rival jocks on vultures, bench
// boards with rolled gym mats for ledges, the dodgeball pit with the referee's hand, footballs for eggs and the
// pterodactyl (jock-joust-sprites, jock-joust-props).
(function(g){
const ID='jock-joust',C=JockJoustCore.CONFIG,W=C.width,H=C.height,INK=0x22355a;
const names=['player-up','player-down','player-run-a','player-run-b','bounder-up','bounder-down','hunter-up','hunter-down','lord-up','lord-down','buzzard','rider','egg','egg-crack','burst','feathers','bench','pit','hand-open','hand-grab','ptero-open','ptero-shut'];
const art={"player-up":"@@asset:assets/joust/player-up.webp@@","player-down":"@@asset:assets/joust/player-down.webp@@","player-run-a":"@@asset:assets/joust/player-run-a.webp@@","player-run-b":"@@asset:assets/joust/player-run-b.webp@@","bounder-up":"@@asset:assets/joust/bounder-up.webp@@","bounder-down":"@@asset:assets/joust/bounder-down.webp@@","hunter-up":"@@asset:assets/joust/hunter-up.webp@@","hunter-down":"@@asset:assets/joust/hunter-down.webp@@","lord-up":"@@asset:assets/joust/lord-up.webp@@","lord-down":"@@asset:assets/joust/lord-down.webp@@","buzzard":"@@asset:assets/joust/buzzard.webp@@","rider":"@@asset:assets/joust/rider.webp@@","egg":"@@asset:assets/joust/egg.webp@@","egg-crack":"@@asset:assets/joust/egg-crack.webp@@","burst":"@@asset:assets/joust/burst.webp@@","feathers":"@@asset:assets/joust/feathers.webp@@","bench":"@@asset:assets/joust/bench.webp@@","pit":"@@asset:assets/joust/pit.webp@@","hand-open":"@@asset:assets/joust/hand-open.webp@@","hand-grab":"@@asset:assets/joust/hand-grab.webp@@","ptero-open":"@@asset:assets/joust/ptero-open.webp@@","ptero-shut":"@@asset:assets/joust/ptero-shut.webp@@"};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ',RIDER=112,BENCH_H=30;
const KIND_TEXT={plain:'',survival:'survival wave. do not get knocked off.',egg:'egg wave. grab the footballs.',ptero:'pterodactyl wave. aim for the open mouth.'};
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],flap:[' ','ArrowUp','w','W']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: wing flaps, the clash of lances, eggs, the troll's grab and the pterodactyl's screech.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.screech=0}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('jock-joust',e))return;
  if(e.type==='flap')b.noise(.05,900,.03);
  else if(e.type==='joust'){b.noise(.12,1600,.06);for(let i=0;i<3;i++)b.tone(500+i*250,.06,.03,'square',.04+i*.06)}
  else if(e.type==='bounce')b.tone(220,.08,.04,'square');
  else if(e.type==='egg')for(let i=0;i<(e.air?4:2);i++)b.tone(880+i*220,.05,.03,'square',i*.05);
  else if(e.type==='hatch'||e.type==='mount')b.tone(600,.1,.025,'triangle');
  else if(e.type==='troll')for(let i=0;i<4;i++)b.tone(120-i*15,.12,.04,'sawtooth',i*.1);
  else if(e.type==='pteroIn'||e.type==='ptero')for(let i=0;i<6;i++)b.tone(2200-i*200,.05,.02,'square',i*.04);
  else if(e.type==='death')b.noise(.8,300,.08);
  else if(e.type==='enemy')for(let i=0;i<4;i++)b.tone(300+i*120,.06,.015,'triangle',i*.06);
  else if(e.type==='spawn')for(let i=0;i<4;i++)b.tone(400+i*160,.06,.02,'triangle',i*.06);
  else if(e.type==='lava')b.noise(.4,250,.06);
  else if(e.type==='free')for(let i=0;i<3;i++)b.tone(500+i*200,.05,.03,'square',i*.05);
  else if(e.type==='cleared')for(let i=0;i<4;i++)b.tone([523,659,784,1047][i],.1,.03,'square',i*.1);
  else if(e.type==='bonus'||e.type==='extra')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09)}
 loop(engine,dt){if(!this.on()||!engine.ptero)return;this.screech-=dt;if(this.screech<=0){this.screech=.8;this.bus.gameTone('jock-joust','screech-voice',1900,.12,.012,'sawtooth')}}
}

class JockJoustGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.sounds=new Sounds(services);this.puffs=[];this.banner=0}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const k of names)this.tex[k]=await texture(P,art[k]);
  // One scale for every rider and bird, set by her eagle with its wings up.
  this.k=RIDER/this.tex['player-up'].width;
  const layer=()=>{const c=new P.Container();app.stage.addChild(c);return c};
  this.pitLayer=layer();this.handLayer=layer();this.ledgeLayer=layer();this.eggLayer=layer();this.riderLayer=layer();this.fxLayer=layer();
  // The dodgeball pit runs along the bottom; the bench boards are laid out again whenever the ledges change.
  const pt=this.tex.pit,ph=H-C.lavaY+30,pw=pt.width*ph/pt.height;for(const x of [-12,W+12-pw]){const s=new P.Sprite(pt);s.anchor.set(0,1);s.scale.set(ph/pt.height);s.position.set(x,H+4);this.pitLayer.addChild(s)}
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
  // A tap shorter than a frame still counts: it is kept for the next step.
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){this.held[name]=down;if(down&&!e.repeat&&name==='flap')this.tapped=true;e.preventDefault()}
  if(down&&!e.repeat)this.edge(k)}
 edge(k){if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller: stick (with a dead zone) or D-pad steers left and right; A flaps, one flap per press; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0,dz=v=>Math.abs(v)<.2?0:Math.sign(v)*Math.min(1,(Math.abs(v)-.2)/.7);
   now.axis=dz(x);now.left=b(14);now.right=b(15);now.up=b(12)||y<-.5;now.down=b(13)||y>.5;now.fire=b(0);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.fire&&!this.pad.fire)this.edge(' ')}
  this.pad=now}
 // Flap counts only once it has been let go since play resumed, so the A that starts the page does not flap.
 // Touch: every press flaps once; drag left or right to steer.
 input(){const pad=this.pad,h=this.held,s=this.touch.stick(),flap=!!(h.flap||pad.fire||this.tapped||this.touch.take('presses').length);this.tapped=false;if(!flap)this.fireArmed=true;
  const kx=(h.right||pad.right?1:0)-(h.left||pad.left?1:0);return{axis:Math.sign(kx||pad.axis||s.x)||0,flap:flap&&this.fireArmed}}
 newGame(seed=this.seed){this.seed=seed;this.endHold=0;this.engine=new JockJoustCore.JoustEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,JockJoustCore)||null;this.paused=false;this.tapped=false;this.puffs=[];this.bonus=null;this.banner=2.5;this.ledgeKey='';if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);this.banner-=dt;
   // The last life's feathers settle for a moment before the end screen.
   if(this.engine.state==='end'&&(this.endHold+=dt)>=C.deathPause)this.endGame()}
  for(const f of this.puffs)f.life-=dt;this.puffs=this.puffs.filter(f=>f.life>0);if(this.bonus&&!this.paused&&!this.simPaused&&(this.bonus.life-=dt)<=0)this.bonus=null;
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(ev.type==='joust'){this.puffs.push({x:ev.x,y:ev.y-30,life:.5,size:70,t:'burst',text:String(ev.points)});this.puffs.push({x:ev.x,y:ev.y-40,life:.9,size:60,t:'feathers',vy:-30})}
   if(ev.type==='egg'||ev.type==='ptero')this.puffs.push({x:ev.x,y:ev.y-20,life:.5,size:ev.type==='ptero'?110:40,t:'burst',text:String(ev.points)});
   // Wave bonuses go on the message line, so the points of the hit that earned them stay readable.
   if(ev.type==='bonus')this.bonus={text:ev.kind+' bonus '+ev.points,life:2.2};
   if(ev.type==='death')this.puffs.push({x:ev.x,y:ev.y-30,life:1.2,size:100,t:'feathers'});
   if(ev.type==='mount'||ev.type==='lava')this.puffs.push({x:ev.x,y:ev.y-30,life:.4,size:60,t:'burst'});
   if(ev.type==='wave')this.banner=2.5;
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 pool(layer,list,n,t){while(list.length<n){const s=new this.P.Sprite(this.tex[t]);s.anchor.set(.5);layer.addChild(s);list.push(s)}list.forEach((s,i)=>s.visible=i<n);return list}
 // Bench boards: one stretched board per ledge, its top face level with the ledge's surface.
 ledges(){const e=this.engine,key=e.surf.map(l=>l.name+l.x1).join();if(key===this.ledgeKey)return;this.ledgeKey=key;const bt=this.tex.bench;
  const bs=this.pool(this.ledgeLayer,this.benchSprites??=[],e.surf.length,'bench');e.surf.forEach((l,i)=>{const s=bs[i],w=l.x2-l.x1+(l.x1<=0||l.x2>=W?12:0);s.anchor.set(0,.18);s.scale.set(w/bt.width,(l.name==='base'?BENCH_H*1.3:BENCH_H)/bt.height);s.position.set(l.x1<=0?l.x1-12:l.x1,l.y)})}
 // A rider sprite: wings up just after a flap, down when gliding, two running steps on a ledge; facing flips it.
 riderTex(kind,b,clock){const pre=kind==='player'?'player':kind;if(b.ground&&kind==='player')return pre+(Math.abs(b.vx)>10&&Math.floor(clock*10)%2?'-run-b':'-run-a');return pre+(b.ground?'-down':b.vy<-20?'-up':'-down')}
 render(){const e=this.engine,T=this.tex,k=this.k;this.ledges();
  const riders=[];if(e.player)riders.push(['player',e.player]);for(const f of e.enemies)riders.push([f.kind,f]);
  // A rider crossing the wrapping edge shows on both sides, half at each, as on the cabinet.
  const half=RIDER/2,draws=[];for(const r of riders){draws.push([...r,0]);if(r[1].x<half)draws.push([...r,W]);else if(r[1].x>W-half)draws.push([...r,-W])}
  const rs=this.pool(this.riderLayer,this.riderSprites??=[],draws.length+e.loose.length+e.pteros.length,'player-up');
  draws.forEach(([kind,b,ox],i)=>{const s=rs[i],t=T[this.riderTex(kind,b,e.clock)];if(s.texture!==t)s.texture=t;s.anchor.set(.5,.96);s.scale.set(k*(b.facing<0?-1:1),k);s.position.set(b.x+ox,b.y);
   s.alpha=b.born>0?.35+.3*Math.sin(e.clock*30):b.shield>0?(Math.floor(e.clock*8)%2?.5:1):1});
  const nr=draws.length;
  e.loose.forEach((b,j)=>{const s=rs[nr+j];if(s.texture!==T.buzzard)s.texture=T.buzzard;s.anchor.set(.5,.96);s.scale.set(k*(b.vx<0?-1:1),k);s.position.set(b.x,b.y);s.alpha=1});
  e.pteros.forEach((t,j)=>{const s=rs[nr+e.loose.length+j],tx=T[e.mouthOpen(t)?'ptero-open':'ptero-shut'],kp=160/T['ptero-open'].width;if(s.texture!==tx)s.texture=tx;s.anchor.set(.5,.5);s.scale.set(kp*(t.vx<0?-1:1),kp);s.position.set(t.x,t.y-26);s.alpha=1});
  // Footballs for eggs: whole, then split open, then the little rider waving for a bird.
  const es=this.pool(this.eggLayer,this.eggSprites??=[],e.eggs.length,'egg');
  e.eggs.forEach((o,i)=>{const s=es[i],name=o.state==='egg'?'egg':o.t>C.mountDelay/2?'egg-crack':'rider',t=T[name];if(s.texture!==t)s.texture=t;s.anchor.set(.5,1);s.scale.set(name==='rider'?44/t.height:32/T.egg.width);s.position.set(o.x,o.y+2)});
  // The referee's hand: it holds whoever it caught, and reaches up under anyone flying low over the open pit.
  const hands=[];for(const [,b] of riders){if(b.grab)hands.push([b,'hand-grab']);else if(!b.ground&&b.y>C.trollY-50&&e.wave>=4&&e.lavaOpen(b.x))hands.push([b,'hand-open'])}
  const hs=this.pool(this.handLayer,this.handSprites??=[],hands.length,'hand-open');
  hands.forEach(([b,name],i)=>{const s=hs[i],t=T[name];if(s.texture!==t)s.texture=t;s.anchor.set(.5,0);s.scale.set(100/T['hand-open'].height);s.position.set(b.x,Math.max(b.y-14,C.lavaY-60))});
  const ps=this.pool(this.fxLayer,this.puffSprites??=[],this.puffs.length,'burst');this.puffs.forEach((f,i)=>{const s=ps[i],t=T[f.t];if(s.texture!==t)s.texture=t;if(f.vy)f.y+=f.vy/60;s.position.set(f.x,f.y);s.scale.set(f.size/t.width);s.alpha=Math.min(1,f.life*4)});
  const hitText=this.puffs.find(f=>f.text);this.pointsText.text=hitText?hitText.text:'';if(hitText)this.pointsText.position.set(hitText.x,hitText.y-44);
  this.scoreText.text=String(e.score).padStart(6,'0');this.livesText.text='lives '+Math.max(0,e.lives)+'   wave '+e.wave;
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='final grade.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  else if(e.state==='cleared'){msg='next period.'}
  else if(this.banner>0){msg='wave '+e.wave;sub=KIND_TEXT[e.kind]}
  if(this.bonus&&this.mode!=='initials'&&this.mode!=='over')sub=this.bonus.text;
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(this.mode==='initials'||this.mode==='over'||e.state==='cleared');this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.livesText,this.bestText,this.pointsText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  // A paper-coloured edge keeps messages and points readable over the busy play field.
  for(const t of [this.message,this.sub,this.pointsText])t.style.stroke={color:0xf7f0e2,width:Math.max(3,Math.round(t.style.fontSize*.16)),join:'round'};
  this.scoreText.position.set(16,0);this.livesText.position.set(W-16,10);this.bestText.position.set(W/2,10);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.livesText,this.bestText,this.pointsText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class JockJoustAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1982){if(this.api)return this.api;const frame=document.createElement('div');frame.id='jock-joust-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new JockJoustGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>JockJoustTests.run(JockJoustCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.fireArmed=false;this.game.tapped=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2JockJoust={Adapter:JockJoustAdapter,Game:JockJoustGame,art};
})(globalThis);
