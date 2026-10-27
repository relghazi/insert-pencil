'use strict';
// Lunch Lander play page: runs LunchLanderCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over her graph paper: a lunch-tray lander on drinking-straw legs, a ketchup-packet flame, mashed-potato
// peaks with a ballpoint outline and cafeteria tables as the landing pads (lander-sprites).
(function(g){
const ID='lunch-lander',C=LunchLanderCore.CONFIG,W=C.width,H=C.height,INK=0x22355a;
const art={lander:"@@asset:assets/lander/lander.webp@@",'lander-thrust':"@@asset:assets/lander/lander-thrust.webp@@",crash:"@@asset:assets/lander/crash.webp@@",
 table:"@@asset:assets/lander/table.webp@@",potato:"@@asset:assets/lander/potato.webp@@",milk:"@@asset:assets/lander/milk.webp@@"};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ',LANDER_W=80;
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],thrust:['ArrowUp','w','W'],abort:[' ']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: an engine rumble that follows the throttle, a chime for a landing, a crunch for a crash.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.rumble=0}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('lunch-lander',e))return;
  if(e.type==='landed')for(let i=0;i<(e.kind==='good'?3:1);i++)b.tone(660+i*220,.1,.05,'square',i*.1);
  else if(e.type==='crash')b.noise(.9,500,.09);
  else if(e.type==='out-of-fuel')b.tone(180,.4,.05,'sawtooth')}
 // Below 100 units a short warning beep repeats every second while flying.
 loop(engine,dt){if(!this.on())return;if(engine.state==='fly'&&engine.fuel>0&&engine.fuel<100){this.warn=(this.warn||0)-dt;if(this.warn<=0){this.warn=1;this.bus.gameTone('lunch-lander','warn-voice',1320,.08,.03,'square')}}const t=engine.p.throttle;if(t<=0||engine.state!=='fly')return;this.rumble-=dt;if(this.rumble<=0){this.rumble=.08;this.bus.gameNoise('lunch-lander','rumble-voice',.09,180+t*200,.02+t*.03)}}
}

class LanderGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.sounds=new Sounds(services)}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const [k,v] of Object.entries(art))this.tex[k]=await texture(P,v);
  // The landscape: mashed potato under the terrain line, a wobbly ballpoint outline on top.
  const T=C.terrain,poly=[...T.flat(),W,H,0,H];
  const fill=new P.TilingSprite({texture:this.tex.potato,width:W,height:H});fill.tileScale.set(.5);const mask=new P.Graphics().poly(poly).fill(0xffffff);fill.mask=mask;app.stage.addChild(fill,mask);
  const line=new P.Graphics();let first=true;for(const [x,y] of T){const jx=x+(Math.sin(x*.7)*.8),jy=y+Math.cos(x*.3)*.8;if(first){line.moveTo(jx,jy);first=false}else line.lineTo(jx,jy)}line.stroke({width:3,color:INK,alpha:.9});app.stage.addChild(line);
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'});
  this.padTags=[];for(const pad of C.pads){const t=new P.Sprite(this.tex.table);t.anchor.set(.5,0);t.width=pad.x1-pad.x0+10;t.height=t.width*this.tex.table.height/this.tex.table.width;t.position.set((pad.x0+pad.x1)/2,pad.y-4);app.stage.addChild(t);
   const label=new P.Text({text:'x'+pad.bonus,style:style(22)});label.anchor.set(.5,0);label.position.set((pad.x0+pad.x1)/2,pad.y+t.height);app.stage.addChild(label);this.padTags.push(label)}
  const milk=new P.Sprite(this.tex.milk);milk.anchor.set(.5,1);milk.height=46;milk.scale.x=milk.scale.y;milk.position.set(580,380);app.stage.addChild(milk);
  this.ship=new P.Sprite(this.tex.lander);this.ghost=new P.Sprite(this.tex.lander);app.stage.addChild(this.ship,this.ghost);
  this.wreck=new P.Sprite(this.tex.crash);this.wreck.anchor.set(.5,1);this.wreck.visible=false;app.stage.addChild(this.wreck);
  this.hud=new P.Container();app.stage.addChild(this.hud);
  const text=(size,ax=.5,ay=0)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,ay);this.hud.addChild(t);return t};
  this.scoreText=text(52,0);this.gauges=text(22,1);this.gauges.style.align='right';this.bestText=text(22);this.message=text(52,.5,.5);this.sub=text(30,.5,.5);
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
 // Controller: stick or D-pad turns; RT is the throttle (analog, like the cabinet's lever); A is full thrust; Y aborts; Menu pauses.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0;
   now.turn=Math.abs(x)<.2?0:Math.sign(x)*Math.min(1,(Math.abs(x)-.2)/.7);now.left=b(14);now.right=b(15);now.throttle=Math.max(p.buttons[7]?.value||0,b(0)?1:0);now.abort=b(3);now.up=b(12)||y<-.5;now.down=b(13)||y>.5;now.a=b(0);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.a&&!this.pad.a)this.edge(' ')}
  this.pad=now}
 // Thrust counts only once it has been let go since play resumed, so the A that starts the page does not fire the engine.
 input(){const pad=this.pad,h=this.held,s=this.touch.stick(),keyTurn=(h.right||pad.right?1:0)-(h.left||pad.left?1:0),throttle=Math.max(h.thrust||s.f?1:0,pad.throttle||0);if(throttle===0)this.armed=true;if(!h.abort&&!pad.abort)this.abortArmed=true;
  return{turn:keyTurn||pad.turn||s.x,throttle:this.armed?throttle:0,abort:this.abortArmed&&!!(h.abort||pad.abort)||this.touch.fingers.size>1}}
 newGame(seed=this.seed){this.seed=seed;this.engine=new LunchLanderCore.LanderEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,LunchLanderCore)||null;this.armed=this.abortArmed=false;this.paused=false;if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);if(this.engine.state==='end')this.endGame()}
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 render(){const e=this.engine,p=e.p,T=this.tex,crashed=e.result?.kind==='crash';
  const flame=p.throttle>0&&e.state==='fly'&&Math.floor(e.clock*24)%3!==0,s=this.ship;s.texture=flame?T['lander-thrust']:T.lander;s.scale.set(LANDER_W/T.lander.width);
  // Both frames share the tray's top edge; the lander turns about the middle of the tray-and-legs drawing.
  const hL=T.lander.height*s.scale.y;s.anchor.set(.5,(T.lander.height/2)/s.texture.height);s.position.set(p.x,p.y+C.bodyH/2-hL/2);s.rotation=p.angle;
  s.visible=!crashed&&e.state!=='end';
  // The landscape wraps at the sides, so a tray crossing an edge is also drawn coming in on the other side.
  const gh=this.ghost,edge=p.x<LANDER_W?W:p.x>W-LANDER_W?-W:0;gh.visible=s.visible&&!!edge;if(edge){gh.texture=s.texture;gh.scale.copyFrom(s.scale);gh.anchor.copyFrom(s.anchor);gh.rotation=s.rotation;gh.position.set(s.x+edge,s.y)}this.wreck.visible=crashed;if(crashed){this.wreck.scale.set(LANDER_W*1.1/T.crash.width);this.wreck.position.set(p.x,LunchLanderCore.ground(p.x)+4)}
  this.scoreText.text=String(e.score).padStart(4,'0');
  // Two short lines like the cabinet's top strip, so a new tray coming in at the top never starts under them.
  this.gauges.text='fuel '+Math.ceil(e.fuel)+'   altitude '+e.altitude()+'\nacross '+Math.round(p.vx)+'   down '+Math.round(p.vy);
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='out of fuel.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  else if(e.state==='fly'&&e.fuel<=0){msg='out of fuel.'}
  else if(e.state==='fly'&&e.fuel<100)sub='fuel low.'
  else if(e.state==='landed'&&e.result){const r=e.result;msg=r.kind==='good'?'nice landing.':r.kind==='hard'?'hard landing.':'lunch is ruined.';sub=r.points+' points'}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(this.mode==='initials'||this.mode==='over'||e.state==='landed');this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.gauges,this.bestText,...this.padTags])t.style.fontSize=px(22);for(const t of this.padTags)t.style.stroke={color:0xf7f0e2,width:Math.max(3,Math.round(t.style.fontSize*.2)),join:'round'};this.sub.style.fontSize=px(30);
  this.scoreText.position.set(30,14);this.gauges.position.set(W-30,18);this.bestText.position.set(W/2,22);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.gauges,this.bestText,this.message,this.sub,...this.padTags].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class LanderAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1979){if(this.api)return this.api;const frame=document.createElement('div');frame.id='lander-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new LanderGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>LunchLanderTests.run(LunchLanderCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.armed=this.game.abortArmed=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);removeEventListener('blur',game.onBlur);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2LunchLander={Adapter:LanderAdapter,Game:LanderGame,art};
})(globalThis);
