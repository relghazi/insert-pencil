'use strict';
// Detention Breakout play page: runs DetentionBreakoutCore at a fixed 120 Hz and draws it with PixiJS straight onto the host
// page (no iframe), over her ruled paper: a ballpoint detention-room frame, coloured-pencil bricks, a wooden ruler paddle
// and a paper-wad ball (breakout-sprites, breakout-frame).
(function(g){
const ID='detention-breakout',C=DetentionBreakoutCore.CONFIG,W=C.width,H=C.height,INK=0x22355a;
const art={frame:"@@asset:assets/breakout/frame.webp@@",red:"@@asset:assets/breakout/brick-red.webp@@",orange:"@@asset:assets/breakout/brick-orange.webp@@",
 green:"@@asset:assets/breakout/brick-green.webp@@",yellow:"@@asset:assets/breakout/brick-yellow.webp@@",ruler:"@@asset:assets/breakout/ruler.webp@@",
 ball:"@@asset:assets/breakout/ball.webp@@"};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's blips: a tone per brick row (higher toward the top), a low one off the paddle, a buzz for a lost ball.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('detention-breakout',e))return;
  if(e.type==='brick')b.tone(330+(7-e.row)*70,.04,.05,'square');
  else if(e.type==='paddle')b.tone(220,.035,.05,'square');
  else if(e.type==='side'||e.type==='top')b.tone(260,.025,.03,'square');
  else if(e.type==='miss')b.tone(110,.4,.06,'sawtooth');
  else if(e.type==='wall')for(let i=0;i<4;i++)b.tone(440+i*110,.08,.05,'square',i*.09);
  else if(e.type==='gameover')for(let i=0;i<3;i++)b.tone(e.cleared?660:200,.12,.05,'square',i*.16)}
}

class BreakoutGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.sounds=new Sounds(services);this.bits=[]}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const [k,v] of Object.entries(art))this.tex[k]=await texture(P,v);
  const frame=new P.Sprite(this.tex.frame);frame.width=W;frame.height=H;frame.alpha=.9;app.stage.addChild(frame);
  this.brickLayer=new P.Container();app.stage.addChild(this.brickLayer);this.bitLayer=new P.Container();app.stage.addChild(this.bitLayer);
  const make=t=>{const s=new P.Sprite(this.tex[t]);s.anchor.set(.5);app.stage.addChild(s);return s};
  this.ruler=make('ruler');this.ball=make('ball');this.ball.scale.set(C.ballR*3.0/this.ball.texture.width);
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'});
  this.hud=new P.Container();app.stage.addChild(this.hud);
  const text=(size,ax=.5,ay=0)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,ay);this.hud.addChild(t);return t};
  this.scoreText=text(52,0);this.ballsText=text(22,1);this.bestText=text(22);this.message=text(52,.5,.5);this.sub=text(30,.5,.5);
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
 // Controller: stick (analog, with a dead zone) or D-pad moves the ruler; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0;
   now.axis=Math.abs(x)<.2?0:Math.sign(x)*Math.min(1,(Math.abs(x)-.2)/.7);now.left=b(14);now.right=b(15);now.up=b(12);now.down=b(13);now.a=b(0);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){const up=now.up||now.axis>.5,down=now.down||now.axis<-.5;if(up&&!this.pad.upE)this.edge('ArrowUp');if(down&&!this.pad.downE)this.edge('ArrowDown');if(now.a&&!this.pad.a)this.edge(' ');now.upE=up;now.downE=down}
  this.pad=now}
 input(){const pad=this.pad,h=this.held,p=this.touch.stick().f,d=p?p.x-this.engine.paddle.x:0;const keys=(h.right||pad.right?1:0)-(h.left||pad.left?1:0);return{axis:keys||pad.axis||(Math.abs(d)>1.5?Math.max(-1,Math.min(1,d/7)):0)}}
 newGame(seed=this.seed){this.seed=seed;this.engine=new DetentionBreakoutCore.BreakoutEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,DetentionBreakoutCore)||null;this.paused=false;this.bits=[];if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   if(this.engine.state==='end')this.endGame()}
  for(const b of this.bits){b.x+=b.vx*dt;b.y+=b.vy*dt;b.vy+=900*dt;b.r+=b.spin*dt;b.life-=dt}this.bits=this.bits.filter(b=>b.life>0);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(ev.type==='brick')for(let i=0;i<5;i++){const a=Math.random()*Math.PI*2,s=80+Math.random()*160;this.bits.push({x:ev.x,y:ev.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-120,r:0,spin:(Math.random()-.5)*10,life:.5+Math.random()*.3,t:ev.colour})}
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 render(){const e=this.engine,P=this.P,T=this.tex;
  const alive=e.bricks.filter(k=>k.alive),kids=this.brickLayer.children;while(kids.length<alive.length){const s=new P.Sprite(T.red);this.brickLayer.addChild(s)}
  kids.forEach((s,i)=>{const k=alive[i];s.visible=!!k;if(!k)return;s.texture=T[k.colour];s.position.set(k.x,k.y);s.width=k.w;s.height=k.h});
  const bk=this.bitLayer.children;while(bk.length<this.bits.length){const s=new P.Sprite(T.red);s.anchor.set(.5);this.bitLayer.addChild(s)}
  bk.forEach((s,i)=>{const b=this.bits[i];s.visible=!!b;if(!b)return;s.texture=T[b.t];s.position.set(b.x,b.y);s.width=10;s.height=6;s.rotation=b.r;s.alpha=Math.min(1,b.life*3)});
  const p=e.paddle;this.ruler.position.set(p.x,C.paddleY);this.ruler.width=p.w;this.ruler.height=C.paddleH*1.4;
  // While a ball waits to be served it blinks where the serve will launch it (above the paddle, below the wall), so it does not jump there.
  const serving=e.state==='serve';this.ball.visible=e.state!=='end'&&(!serving||Math.floor(e.clock*4)%2===0);
  if(serving)this.ball.position.set(Math.max(C.wall+60,Math.min(W-C.wall-60,e.paddle.x)),C.brickTop+C.rows*(C.brickH+C.gap)+60);else this.ball.position.set(e.ball.x,e.ball.y);this.ball.rotation=e.clock*(e.ball.vx>=0?5:-5);
  this.scoreText.text=String(e.score).padStart(3,'0');this.ballsText.text='balls '+Math.max(0,e.balls);
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg=e.bricks.some(k=>k.alive)?'detention.':'you broke out!';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.ballsText,this.bestText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  this.scoreText.position.set(C.wall+16,C.top+12);this.ballsText.position.set(W-C.wall-16,C.top+18);this.bestText.position.set(W/2,C.top+18);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.ballsText,this.bestText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class BreakoutAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1976){if(this.api)return this.api;const frame=document.createElement('div');frame.id='breakout-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new BreakoutGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>DetentionBreakoutTests.run(DetentionBreakoutCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);removeEventListener('blur',game.onBlur);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2DetentionBreakout={Adapter:BreakoutAdapter,Game:BreakoutGame,art};
})(globalThis);
