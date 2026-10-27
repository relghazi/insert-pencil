'use strict';
// Space Substitutes play page: runs SpaceSubstitutesCore at a fixed 120 Hz and draws it with PixiJS straight onto the host
// page (no iframe), over her ruled paper: substitute teachers marching, a student with a pencil launcher, textbook shields
// and the principal's flying chair (invaders-sprites).
(function(g){
const ID='space-substitutes',C=SpaceSubstitutesCore.CONFIG,W=C.width,H=C.height,INK=0x22355a;
const art={sub1a:"@@asset:assets/invaders/sub1a.webp@@",sub1b:"@@asset:assets/invaders/sub1b.webp@@",sub2a:"@@asset:assets/invaders/sub2a.webp@@",sub2b:"@@asset:assets/invaders/sub2b.webp@@",sub3a:"@@asset:assets/invaders/sub3a.webp@@",sub3b:"@@asset:assets/invaders/sub3b.webp@@",player:"@@asset:assets/invaders/player.webp@@",ufo:"@@asset:assets/invaders/ufo.webp@@",pencil:"@@asset:assets/invaders/pencil.webp@@",chalk:"@@asset:assets/invaders/chalk.webp@@",books:"@@asset:assets/invaders/books.webp@@",dust:"@@asset:assets/invaders/dust.webp@@"};
const TYPE=['sub1','sub2','sub2','sub3','sub3'];
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],fire:[' ']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: the four-note marching bass, the shot, an invader hit, the mystery ship's warble and the player's loss.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.ufoTime=0}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('space-substitutes',e))return;
  if(e.type==='march')b.gameTone('space-substitutes','march-voice',[98,87,78,73][e.note],.09,.12,'triangle');
  else if(e.type==='shot')b.noise(.12,1800,.04);
  else if(e.type==='kill')b.noise(.18,900,.06);
  else if(e.type==='ufo-hit')for(let i=0;i<4;i++)b.tone(880-i*120,.06,.04,'square',i*.07);
  else if(e.type==='death')b.noise(.8,400,.09);
  else if(e.type==='extra')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09)}
 loop(engine,dt){if(!this.on()||!engine.ufo)return;this.ufoTime-=dt;if(this.ufoTime<=0){this.ufoTime=.11;this.flip=!this.flip;this.bus.gameTone('space-substitutes','ufo-voice',this.flip?620:700,.1,.02,'sawtooth')}}
}

class InvadersGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.sounds=new Sounds(services);this.puffs=[]}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const [k,v] of Object.entries(art))this.tex[k]=await texture(P,v);
  const layer=()=>{const c=new P.Container();app.stage.addChild(c);return c};
  this.shieldLayer=layer();this.invLayer=layer();this.fxLayer=layer();
  this.shieldSprites=[];this.shieldMasks=[];
  const sprite=(t,ax=.5,ay=.5)=>{const s=new P.Sprite(this.tex[t]);s.anchor.set(ax,ay);app.stage.addChild(s);return s};
  this.player=sprite('player',.5,1);this.player.scale.set(74/this.player.texture.height);
  this.shot=sprite('pencil');this.shot.scale.set(C.shotH*1.6/this.shot.texture.height);
  // The flying chair is drawn a touch lower and smaller than before so it crosses under the score, not through it.
  this.ufo=sprite('ufo');this.ufo.scale.set(C.ufoW*1.15/this.ufo.texture.width);
  this.bombLayer=layer();
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'});
  this.hud=layer();const text=(size,ax=.5,ay=0)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,ay);this.hud.addChild(t);return t};
  this.scoreText=text(52,0);this.livesText=text(22,1);this.bestText=text(22);this.pointsText=text(22);this.message=text(52,.5,.5);this.sub=text(30,.5,.5);
  this.onKey=e=>this.key(e,true);this.offKey=e=>this.key(e,false);addEventListener('keydown',this.onKey);addEventListener('keyup',this.offKey);this.touch=g.No2TouchPad?.(this,app.canvas,W,H)||{fingers:new Map(),stick:()=>({x:0,y:0,d:0}),dir4:()=>null,take:k=>k==='twos'?0:[]};this.onBlur=()=>{this.held={}};addEventListener('blur',this.onBlur);
  this.tracing=await g.No2Tracing?.attach(P,app,this.hud,{quiet:[this.message,this.sub]});this.newGame(this.seed);app.ticker.add(t=>this.frame(t.deltaMS/1000));return this}
 inputEnabled(){return !g.No2||g.No2.gameInputEnabled?.()!==false}
 // A key let go while a dialog has the input still counts as let go, so nothing stays held after it closes.
 key(e,down){if(!this.inputEnabled()){if(!down)this.held={};return}const k=e.key;
  // Initials: letters typed on the keyboard go straight in (owner 2026-10-25), so no letter moves or pauses here.
  if(this.mode==='initials'){if(down){e.preventDefault();if(!e.repeat||k.startsWith('Arrow'))this.edge(k)}return}
  if(down&&(k==='p'||k==='P')){this.pause();e.preventDefault();return}
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){this.held[name]=down;e.preventDefault()}
  // A quick tap can go down and up between two frames; latch it so every press fires.
  if(down&&!e.repeat&&KEYS.fire.includes(k))this.tap=true;
  if(down&&!e.repeat)this.edge(k)}
 edge(k){if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller: stick (analog, with a dead zone) or D-pad moves; A fires; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0;
   now.axis=Math.abs(x)<.2?0:Math.sign(x)*Math.min(1,(Math.abs(x)-.2)/.7);now.left=b(14);now.right=b(15);now.up=b(12)||y<-.5;now.down=b(13)||y>.5;now.fire=b(0);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.fire&&!this.pad.fire)this.edge(' ')}
  this.pad=now}
 // Fire counts only once it has been let go since play resumed, so the A that starts the page does not shoot.
 input(){const pad=this.pad,h=this.held,fire=!!(h.fire||pad.fire||this.tap||this.touch.take('presses').length);this.tap=false;if(!fire)this.fireArmed=true;const p=this.touch.stick().f,d=p?p.x-this.engine.player.x:0,keys=(h.right||pad.right?1:0)-(h.left||pad.left?1:0);return{axis:keys||pad.axis||(Math.abs(d)>1.5?Math.max(-1,Math.min(1,d/3)):0),fire:fire&&this.fireArmed}}
 newGame(seed=this.seed){this.seed=seed;this.engine=new SpaceSubstitutesCore.InvadersEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,SpaceSubstitutesCore)||null;this.fireArmed=false;this.tap=false;this.paused=false;this.puffs=[];this.shieldKey='';if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);if(this.engine.state==='end')this.endGame()}
  for(const f of this.puffs)f.life-=dt;this.puffs=this.puffs.filter(f=>f.life>0);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(ev.type==='kill')this.puffs.push({x:ev.x,y:ev.y,life:.3,size:44});
   if(ev.type==='ufo-hit')this.puffs.push({x:ev.x,y:C.ufoY,life:1,size:60,text:String(ev.points)});
   if(ev.type==='death')this.puffs.push({x:ev.x,y:C.playerY-20,life:1.2,size:80});
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 pool(layer,list,n,t){while(list.length<n){const s=new this.P.Sprite(this.tex[t]);s.anchor.set(.5);layer.addChild(s);list.push(s)}list.forEach((s,i)=>s.visible=i<n);return list}
 render(){const e=this.engine,P=this.P,T=this.tex;
  // Shields: the textbook stack, masked to the cells still standing.
  const key=e.shields.map(s=>s.cells.filter(Boolean).length).join();if(key!==this.shieldKey){this.shieldKey=key;
   e.shields.forEach((s,i)=>{let sp=this.shieldSprites[i],m=this.shieldMasks[i];if(!sp){sp=new P.Sprite(T.books);sp.position.set(s.x,s.y);sp.width=C.shieldW;sp.height=C.shieldH;m=new P.Graphics();this.shieldLayer.addChild(sp,m);sp.mask=m;this.shieldSprites[i]=sp;this.shieldMasks[i]=m}
    m.clear();const c=C.shieldCell;for(let y=0;y<s.m;y++)for(let x=0;x<s.n;x++)if(s.cells[y*s.n+x])m.rect(s.x+x*c,s.y+y*c,c,c);m.fill(0xffffff)})}
  const live=e.alive(),inv=this.pool(this.invLayer,this.invs??=[],live.length,'sub1a');
  live.forEach((v,i)=>{const s=inv[i];s.texture=T[TYPE[v.row]+(e.frame?'b':'a')];s.anchor.set(.5,1);s.scale.set((C.invH+14)/s.texture.height);s.position.set(v.x+C.invW/2,v.y+C.invH+4)});
  const bombs=this.pool(this.bombLayer,this.bombSprites??=[],e.bombs.length,'chalk');e.bombs.forEach((b,i)=>{const s=bombs[i];s.scale.set(C.bombH*1.7/s.texture.height);s.position.set(b.x,b.y+C.bombH/2);s.scale.y*=Math.floor(e.clock*12+i)%2?1:-1});
  const puffs=this.pool(this.fxLayer,this.puffSprites??=[],this.puffs.length,'dust');this.puffs.forEach((f,i)=>{const s=puffs[i];s.position.set(f.x,f.y);s.scale.set(f.size/s.texture.width);s.alpha=Math.min(1,f.life*4)});
  const p=e.player;this.player.visible=e.state!=='dead'||Math.floor(e.clock*10)%2===0;this.player.position.set(p.x,C.playerY+C.playerH/2+2);
  this.shot.visible=!!e.shot;if(e.shot)this.shot.position.set(e.shot.x,e.shot.y+C.shotH/2);
  this.ufo.visible=!!e.ufo;if(e.ufo){this.ufo.position.set(e.ufo.x,C.ufoY+6);this.ufo.scale.x=Math.abs(this.ufo.scale.x)*(e.ufo.dir<0?-1:1)}
  const hitText=this.puffs.find(f=>f.text);this.pointsText.text=hitText?hitText.text:'';if(hitText)this.pointsText.position.set(hitText.x,C.ufoY-12);
  this.scoreText.text=String(e.score).padStart(4,'0');this.livesText.text='lives '+Math.max(0,e.lives);
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='class dismissed.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  else if(e.state==='cleared'){msg='next period.'}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg,this.mode==='over');this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.livesText,this.bestText,this.pointsText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  this.scoreText.position.set(C.edge,14);this.livesText.position.set(W-C.edge,22);this.bestText.position.set(W/2,22);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.livesText,this.bestText,this.pointsText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class InvadersAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1978){if(this.api)return this.api;const frame=document.createElement('div');frame.id='invaders-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new InvadersGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>SpaceSubstitutesTests.run(SpaceSubstitutesCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.fireArmed=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);removeEventListener('blur',game.onBlur);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2SpaceSubstitutes={Adapter:InvadersAdapter,Game:InvadersGame,art};
})(globalThis);
