'use strict';
// Gym Class Pong play page: runs GymPongCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over her maths-quiz paper: a ballpoint gym court, two wooden gym benches and a dodgeball (pong-sprites, pong-court).
(function(g){
const ID='gym-class-pong',C=GymPongCore.CONFIG,W=C.width,H=C.height,INK=0x22355a;
const art={court:"@@asset:assets/pong/court.webp@@",'bench-blue':"@@asset:assets/pong/bench-blue.webp@@",'bench-red':"@@asset:assets/pong/bench-red.webp@@",
 ball:"@@asset:assets/pong/ball.webp@@",whistle:"@@asset:assets/pong/whistle.webp@@"};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS={up:['ArrowUp','w','W'],down:['ArrowDown','s','S']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The 1972 cabinet's three sounds: a higher blip off a bench, a lower one off a wall, a long low tone for a point.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('gym-class-pong',e))return;
  if(e.type==='hit')b.tone(490,.035,.05,'square');
  else if(e.type==='wall')b.tone(245,.03,.04,'square');
  else if(e.type==='point')b.tone(245,.26,.05,'square');
  else if(e.type==='gameover')for(let i=0;i<3;i++)b.tone(e.winner==='left'?660:330,.12,.05,'square',i*.16)}
}

class PongGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.sounds=new Sounds(services)}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const [k,v] of Object.entries(art))this.tex[k]=await texture(P,v);
  const court=new P.Sprite(this.tex.court);court.position.set(0,C.wall);court.width=W;court.height=H-2*C.wall;court.alpha=.85;app.stage.addChild(court);
  const make=(t,a=.5)=>{const s=new P.Sprite(this.tex[t]);s.anchor.set(a);app.stage.addChild(s);return s};
  this.benchL=make('bench-blue');this.benchR=make('bench-red');this.ball=make('ball');
  for(const s of [this.benchL,this.benchR])s.scale.set(C.paddleH*1.2/s.texture.height);this.ball.scale.set(C.ballR*2.6/this.ball.texture.width);
  this.whistle=make('whistle');this.whistle.scale.set(54/this.whistle.texture.width);this.whistle.visible=false;
  const style=(size,align='center')=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align});
  this.hud=new P.Container();app.stage.addChild(this.hud);
  const text=(size,ax=.5)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,0);this.hud.addChild(t);return t};
  this.scoreL=text(52);this.scoreR=text(52);this.labelL=text(22);this.labelR=text(22);this.bestText=text(22);
  this.message=text(52);this.message.anchor.set(.5);this.sub=text(30);this.sub.anchor.set(.5);
  this.labelL.text='you';this.labelR.text='coach';
  this.onKey=e=>this.key(e,true);this.offKey=e=>this.key(e,false);addEventListener('keydown',this.onKey);addEventListener('keyup',this.offKey);this.touch=g.No2TouchPad?.(this,app.canvas,W,H)||{fingers:new Map(),stick:()=>({x:0,y:0,d:0}),dir4:()=>null,take:k=>k==='twos'?0:[]};this.onBlur=()=>{this.held={}};addEventListener('blur',this.onBlur);
  this.tracing=await g.No2Tracing?.attach(P,app,this.hud,{quiet:[this.message,this.sub]});this.newGame(this.seed);app.ticker.add(t=>this.frame(t.deltaMS/1000));return this}
 inputEnabled(){return !g.No2||g.No2.gameInputEnabled?.()!==false}
 // A key let go while a dialog has the input still counts as let go, so nothing stays held after it closes.
 key(e,down){if(!this.inputEnabled()){if(!down)this.held={};return}const k=e.key;
  // Initials: letters typed on the keyboard go straight in (owner 2026-10-25), so no letter moves or pauses here.
  if(this.mode==='initials'){if(down){e.preventDefault();if(!e.repeat||k.startsWith('Arrow'))this.edge(k)}return}
  if(down&&(k==='p'||k==='P')){this.pause();e.preventDefault();return}
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){this.held[name]=down;e.preventDefault()}
  if(down&&!e.repeat)this.edge(k)}
 edge(k){if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller: stick (analog, with a dead zone) or D-pad moves the bench; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,y=p.axes[1]||0;
   now.axis=Math.abs(y)<.2?0:Math.sign(y)*Math.min(1,(Math.abs(y)-.2)/.7);now.up=b(12);now.down=b(13);now.a=b(0);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){const stickUp=now.axis<-.5,stickDown=now.axis>.5;if((now.up||stickUp)&&!this.pad.upE)this.edge('ArrowUp');if((now.down||stickDown)&&!this.pad.downE)this.edge('ArrowDown');if(now.a&&!this.pad.a)this.edge(' ');now.upE=now.up||stickUp;now.downE=now.down||stickDown}
  this.pad=now}
 input(){const pad=this.pad,h=this.held,p=this.touch.stick().f,d=p?p.y-this.engine.left.y:0;const keys=(h.down||pad.down?1:0)-(h.up||pad.up?1:0);return{axis:keys||pad.axis||(Math.abs(d)>1.5?Math.max(-1,Math.min(1,d/6)):0)}}
 newGame(seed=this.seed){this.seed=seed;this.engine=new GymPongCore.PongEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,GymPongCore)||null;this.paused=false;if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   if(this.engine.state==='end')this.endGame()}
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:e.points})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}const score=this.engine.points,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 render(){const e=this.engine,b=e.ball;
  this.benchL.position.set(C.paddleX,e.left.y);this.benchR.position.set(W-C.paddleX,e.right.y);
  this.ball.visible=e.state==='play';this.ball.position.set(b.x,b.y);this.ball.rotation=e.clock*(b.vx>0?6:-6);
  this.whistle.visible=e.state==='serve'&&this.mode!=='initials'&&this.mode!=='over';this.whistle.position.set(W/2,H/2);this.whistle.rotation=Math.sin(e.clock*8)*.15;
  this.scoreL.text=String(e.left.score);this.scoreR.text=String(e.right.score);
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.points:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg=e.winner==='left'?'you beat the coach!':'the coach wins.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreL,this.scoreR,this.message])t.style.fontSize=px(52);for(const t of [this.labelL,this.labelR,this.bestText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  // A paper-coloured edge keeps the numbers and messages clear of the court lines and the net under them.
  for(const t of [this.scoreL,this.scoreR,this.labelL,this.labelR,this.bestText,this.message,this.sub])t.style.stroke={color:0xf7f0e2,width:Math.max(3,Math.round(t.style.fontSize*.16)),join:'round'};
  const top=C.wall+8;this.scoreL.position.set(W/2-110,top+px(22)*1.2);this.scoreR.position.set(W/2+110,top+px(22)*1.2);this.labelL.position.set(W/2-110,top);this.labelR.position.set(W/2+110,top);
  this.bestText.position.set(W/2,H-C.wall-px(22)*1.6);this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreL,this.scoreR,this.labelL,this.labelR,this.bestText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class PongAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1972){if(this.api)return this.api;const frame=document.createElement('div');frame.id='pong-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new PongGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>GymPongTests.run(GymPongCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);removeEventListener('blur',game.onBlur);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2GymPong={Adapter:PongAdapter,Game:PongGame,art};
})(globalThis);
