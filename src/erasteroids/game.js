
'use strict';
// Erasteroids play page: runs ErasteroidsCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over the graph-paper notebook page. Sprites are the owner-approved erast-sprites-v4 drawings.
(function(g){
const ID='erasteroids',C=ErasteroidsCore.CONFIG,W=C.width,H=C.height,INK=0x22355a;
const art={ship:"@@asset:assets/erasteroids/ship.webp@@",'ship-thrust':"@@asset:assets/erasteroids/ship-thrust.webp@@",
 'saucer-big':"@@asset:assets/erasteroids/saucer-big.webp@@",'saucer-small':"@@asset:assets/erasteroids/saucer-small.webp@@",
 'rock-a':"@@asset:assets/erasteroids/rock-a.webp@@",'rock-b':"@@asset:assets/erasteroids/rock-b.webp@@",'rock-c':"@@asset:assets/erasteroids/rock-c.webp@@",'rock-d':"@@asset:assets/erasteroids/rock-d.webp@@",
 'crumb-1':"@@asset:assets/erasteroids/crumb-1.webp@@",'crumb-2':"@@asset:assets/erasteroids/crumb-2.webp@@",'crumb-3':"@@asset:assets/erasteroids/crumb-3.webp@@",'crumb-4':"@@asset:assets/erasteroids/crumb-4.webp@@",'crumb-5':"@@asset:assets/erasteroids/crumb-5.webp@@",
 shot:"@@asset:assets/erasteroids/shot.webp@@"};
const ROCKS=['rock-a','rock-b','rock-c','rock-d'];
// Drawn sizes in playfield units (longest side); hit circles stay in the core.
const SIZE={ship:34,thrust:41,'saucer-big':52,'saucer-small':30,shot:7,crumb:9};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],thrust:['ArrowUp','w','W'],fire:[' ','Enter'],hyper:['ArrowDown','h','H','s','S']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.saucerTime=0;this.thrustTime=0}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('erasteroids',e))return;
  if(e.type==='beat')b.gameTone('erasteroids','beat-voice',e.high?64:55,.11,.14,'triangle');
  else if(e.type==='fire')b.tone(1560,.05,.03,'square');
  else if(e.type==='saucer-fire')b.tone(1100,.06,.025,'square');
  else if(e.type==='explode')b.noise(e.saucer?.45:[0,.18,.3,.45][e.size],e.size===1?1400:e.size===2?900:600,.07);
  else if(e.type==='death')b.noise(.9,500,.09);
  else if(e.type==='extra')for(let i=0;i<6;i++)b.tone(1320,.05,.035,'square',i*.09);
  else if(e.type==='hyper')b.tone(330,.25,.03,'sine')}
 loop(engine,dt){if(!this.on())return;const b=this.bus;
  if(engine.saucer){this.saucerTime-=dt;if(this.saucerTime<=0){const small=engine.saucer.kind==='small';this.saucerTime=small?.09:.14;this.flip=!this.flip;b.gameTone('erasteroids','saucer-voice',(small?1180:780)*(this.flip?1:1.12),this.saucerTime*.9,.018,'square')}}
  if(engine.p.thrusting&&engine.state==='play'){this.thrustTime-=dt;if(this.thrustTime<=0){this.thrustTime=.09;b.gameNoise('erasteroids','thrust-voice',.1,260,.035)}}}
}

class ErasteroidsGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.crumbs=[];this.sounds=new Sounds(services)}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const [k,v] of Object.entries(art))this.tex[k]=await texture(P,v);
  const paper=this.services.assets?.uri?.('paper-graph');if(paper&&!globalThis.No2Locker){this.tex.paper=await texture(P,paper);const s=new P.Sprite(this.tex.paper);s.width=W;s.height=H;app.stage.addChild(s)}
  const field=new P.Container(),mask=new P.Graphics().rect(0,0,W,H).fill(0xffffff);field.mask=mask;app.stage.addChild(mask,field);this.field=field;
  this.layers={rocks:new P.Container(),crumbs:new P.Container(),shots:new P.Container(),ships:new P.Container()};field.addChild(this.layers.rocks,this.layers.crumbs,this.layers.shots,this.layers.ships);
  this.pools={};this.hud=new P.Container();app.stage.addChild(this.hud);
  const style=(size,align='left')=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align});
  this.scoreText=new P.Text({text:'0',style:style(40)});this.scoreText.position.set(28,14);
  this.bestText=new P.Text({text:'',style:style(26,'center')});this.bestText.anchor.set(.5,0);this.bestText.position.set(W/2,18);
  this.message=new P.Text({text:'',style:style(46,'center')});this.message.anchor.set(.5);this.message.position.set(W/2,H/2-40);
  this.sub=new P.Text({text:'',style:style(28,'center')});this.sub.anchor.set(.5);this.sub.position.set(W/2,H/2+18);
  this.lifeIcons=new P.Container();this.lifeIcons.position.set(34,78);this.hud.addChild(this.scoreText,this.bestText,this.lifeIcons,this.message,this.sub);
  this.onKey=e=>this.key(e,true);this.offKey=e=>this.key(e,false);addEventListener('keydown',this.onKey);addEventListener('keyup',this.offKey);this.touch=g.No2TouchPad?.(this,app.canvas,W,H)||{fingers:new Map(),stick:()=>({x:0,y:0,d:0}),dir4:()=>null,take:k=>k==='twos'?0:[]};this.onBlur=()=>{this.held={}};addEventListener('blur',this.onBlur);
  this.tracing=await g.No2Tracing?.attach(P,app,this.hud,{quiet:[this.message,this.sub]});this.newGame(this.seed);app.ticker.add(t=>this.frame(t.deltaMS/1000));return this}
 inputEnabled(){return !g.No2||g.No2.gameInputEnabled?.()!==false}
 key(e,down){if(!this.inputEnabled()){if(!down)this.held={};return}const k=e.key;
  // Initials: letters typed on the keyboard go straight in (owner 2026-10-25), so no letter moves or pauses here.
  if(this.mode==='initials'){if(down){e.preventDefault();if(!e.repeat||k.startsWith('Arrow'))this.edge(k)}return}
  if(down&&(k==='p'||k==='P')){this.pause();e.preventDefault();return}
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){this.held[name]=down;e.preventDefault()}
  // A quick tap can go down and up between two frames; latch it so every press fires or jumps.
  if(down&&!e.repeat){if(KEYS.fire.includes(k))this.tapFire=true;if(KEYS.hyper.includes(k))this.tapHyper=true}
  if(down&&!e.repeat)this.edge(k)}
 edge(k){if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed;now.left=b(14)||p.axes[0]<-.5;now.right=b(15)||p.axes[0]>.5;now.thrust=b(12)||p.axes[1]<-.5||(p.buttons[7]?.value||0)>.3;now.fire=b(0);now.hyper=b(3);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.right&&!this.pad.right)this.edge('ArrowUp');if(now.left&&!this.pad.left)this.edge('ArrowDown');if(now.thrust&&!this.pad.thrust)this.edge('ArrowUp');if(now.fire&&!this.pad.fire)this.edge(' ')}
  this.pad=now}
 // Touch: the ship turns to face the way the finger is dragged and thrusts when pushed far; a tap fires, a two-finger tap is hyperspace.
 // Fire counts only once it has been let go since play started or resumed, so the Space that restarts the page does not shoot.
 input(){const pad=this.pad,h=this.held,t=this.touch,s=t.stick(),p=this.engine.p,T={},fire=!!(h.fire||pad.fire||this.tapFire),hyper=!!(h.hyper||pad.hyper||this.tapHyper);this.tapFire=this.tapHyper=false;if(!fire)this.fireArmed=true;if(!hyper)this.hyperArmed=true;
  if(s.x||s.y){const f=s.f,diff=((Math.atan2(f.y-f.y0,f.x-f.x0)-p.angle)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI;if(Math.abs(diff)>.1)T[diff>0?'right':'left']=true;T.thrust=s.d>56&&Math.abs(diff)<.6}
  return{left:h.left||pad.left||T.left,right:h.right||pad.right||T.right,thrust:h.thrust||pad.thrust||T.thrust,fire:fire&&this.fireArmed||t.take('presses').length>0,hyper:hyper&&this.hyperArmed||t.take('twos')>0}}
 newGame(seed=this.seed){this.seed=seed;this.engine=new ErasteroidsCore.ErasteroidsEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,ErasteroidsCore)||null;this.fireArmed=this.hyperArmed=false;this.tapFire=this.tapHyper=false;this.crumbs=[];this.paused=false;if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);if(this.engine.state==='end')this.endGame()}
  for(const c of this.crumbs){c.x+=c.vx*dt;c.y+=c.vy*dt;c.vx*=.96;c.vy*=.96;c.r+=c.spin*dt;c.life-=dt}this.crumbs=this.crumbs.filter(c=>c.life>0);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(ev.type==='explode'){const n=ev.saucer?10:[0,4,7,10][ev.size];this.burst(ev.x,ev.y,n,ev.saucer?140:60+ev.size*30)}
   if(ev.type==='death')this.burst(ev.x,ev.y,16,170);
   if(this.mode==='play'&&['death','gameover'].includes(ev.type))this.services.save?.record(ID,ev.type,{score:e.score})}}
 burst(x,y,n,speed){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=speed*(.4+Math.random()*.8);this.crumbs.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:Math.random()*6,spin:(Math.random()-.5)*8,life:.6+Math.random()*.5,t:'crumb-'+(1+Math.floor(Math.random()*5))})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 pool(name,layer){const list=this.pools[name]??=[];let i=0;return{get:t=>{let s=list[i];if(!s){s=new this.P.Sprite(t);s.anchor.set(.5);this.layers[layer].addChild(s);list.push(s)}s.texture=t;s.visible=true;s.alpha=1;i++;return s},done:()=>{for(let j=i;j<list.length;j++)list[j].visible=false}}}
 fit(s,size){const t=s.texture,k=size/Math.max(t.width,t.height);s.scale.set(k)}
 // The playfield wraps: anything crossing an edge (the saucer only top to bottom) is also drawn coming in on the other side, as on the cabinet's screen.
 ghosts(x,y,r,wx=true){const xs=[x],ys=[y];if(!wx);else if(x<r)xs.push(x+W);else if(x>W-r)xs.push(x-W);if(y<r)ys.push(y+H);else if(y>H-r)ys.push(y-H);return xs.flatMap(a=>ys.map(b=>[a,b]))}
 render(){const e=this.engine,T=this.tex;
  const rocks=this.pool('rocks','rocks');for(const r of e.rocks){const size=C.rocks[r.size].radius*2.3;for(const [x,y] of this.ghosts(r.x,r.y,size*.6)){const s=rocks.get(T[ROCKS[r.shape]]);this.fit(s,size);s.position.set(x,y);s.rotation=r.turn}}rocks.done();
  const crumbs=this.pool('crumbs','crumbs');for(const c of this.crumbs){const s=crumbs.get(T[c.t]);this.fit(s,SIZE.crumb);s.position.set(c.x,c.y);s.rotation=c.r;s.alpha=Math.min(1,c.life*2)}crumbs.done();
  const shots=this.pool('shots','shots');for(const b of [...e.shots,...e.saucerShots]){const s=shots.get(T.shot);this.fit(s,SIZE.shot);s.position.set(b.x,b.y)}shots.done();
  const ships=this.pool('ships','ships');const p=e.p;if(e.state==='play'&&p.hidden<=0){const flame=p.thrusting&&Math.floor(e.clock*30)%2===0;for(const [x,y] of this.ghosts(p.x,p.y,SIZE.thrust*.6)){const s=ships.get(flame?T['ship-thrust']:T.ship);this.fit(s,flame?SIZE.thrust:SIZE.ship);s.anchor.set(.5,flame?.42:.5);s.position.set(x,y);s.rotation=p.angle+Math.PI/2}}
  if(e.saucer){const k='saucer-'+e.saucer.kind;for(const [x,y] of this.ghosts(e.saucer.x,e.saucer.y,SIZE[k]*.6,false)){const s=ships.get(T[k]);s.anchor.set(.5);this.fit(s,SIZE[k]);s.position.set(x,y);s.rotation=0}}ships.done();
  this.scoreText.text=String(e.score).padStart(2,'0');const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const lives=Math.max(0,Math.min(10,e.lives-(e.state==='play'?1:0)));while(this.lifeIcons.children.length<lives){const s=new this.P.Sprite(T.ship);s.anchor.set(.5);this.fit(s,22);s.position.set(this.lifeIcons.children.length*22,0);this.lifeIcons.addChild(s)}while(this.lifeIcons.children.length>lives)this.lifeIcons.removeChildAt(this.lifeIcons.children.length-1).destroy();
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';if(this.paused){msg='';sub=''}else if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}else if(this.mode==='over'){msg='final grade.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}else if(this.mode==='demo'){msg='';sub=''}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  this.scoreText.style.fontSize=px(52);this.bestText.style.fontSize=px(22);this.message.style.fontSize=px(52);this.sub.style.fontSize=px(30);this.lifeIcons.position.set(34,14+px(52)*1.25);
  for(const t of [this.scoreText,this.bestText,this.message,this.sub])t.style.stroke={color:0xf7f0e2,width:Math.max(3,Math.round(t.style.fontSize*.16)),join:'round'};
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.bestText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class ErasteroidsAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1979){if(this.api)return this.api;const frame=document.createElement('div');frame.id='erasteroids-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new ErasteroidsGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>ErasteroidsTests.run(ErasteroidsCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.held={};this.game.fireArmed=this.game.hyperArmed=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);removeEventListener('blur',game.onBlur);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2Erasteroids={Adapter:ErasteroidsAdapter,Game:ErasteroidsGame,art};
})(globalThis);
