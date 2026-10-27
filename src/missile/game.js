'use strict';
// Spitball Command play page: runs SpitballCommandCore at a fixed 120 Hz and draws it with PixiJS straight onto the host
// page (no iframe), over her ruled paper: student desks to defend, teachers' desks with straw launchers, spitballs with
// pencil trails, a paper airplane and a frisbee overhead, and paper-confetti bursts (missile-sprites).
(function(g){
const ID='spitball-command',C=SpitballCommandCore.CONFIG,W=C.width,H=C.height,INK=0x22355a;
const art={desk:"@@asset:assets/missile/desk.webp@@",'desk-down':"@@asset:assets/missile/desk-down.webp@@",base:"@@asset:assets/missile/base.webp@@",'base-down':"@@asset:assets/missile/base-down.webp@@",
 spitball:"@@asset:assets/missile/spitball.webp@@",plane:"@@asset:assets/missile/plane.webp@@",frisbee:"@@asset:assets/missile/frisbee.webp@@",burst:"@@asset:assets/missile/burst.webp@@",crosshair:"@@asset:assets/missile/crosshair.webp@@"};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],up:['ArrowUp','w','W'],down:['ArrowDown','s','S']};
const FIRE={z:'fireLeft',Z:'fireLeft',x:'fireCentre',X:'fireCentre',c:'fireRight',C:'fireRight',' ':'fireNearest'};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: the launch whoosh, the burst, a city lost, and the end-of-wave tally.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('spitball-command',e))return;
  if(e.type==='fire')b.noise(.15,1400,.04);
  else if(e.type==='burst')b.noise(.35,600,.05);
  else if(e.type==='city-lost'||e.type==='base-lost')b.noise(.8,300,.09);
  else if(e.type==='flyer')b.tone(440,.3,.03,'sawtooth');
  else if(e.type==='wave-end')for(let i=0;i<4;i++)b.tone(880,.05,.04,'square',i*.12);
  else if(e.type==='bonus-city'||e.type==='city-rebuilt')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09);
  // The cabinet's alarm as each wave starts.
  else if(e.type==='wave')for(let i=0;i<6;i++)b.tone(i%2?660:520,.14,.03,'square',i*.15)}
}

class MissileGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.fires={};this.aim=null;this.sounds=new Sounds(services)}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const [k,v] of Object.entries(art))this.tex[k]=await texture(P,v);
  const floor=new P.Graphics();floor.moveTo(0,C.groundY+2);for(let x=0;x<=W;x+=16)floor.lineTo(x,C.groundY+2+Math.sin(x*.21)*1.2);floor.stroke({width:3,color:INK,alpha:.85});app.stage.addChild(floor);
  this.trails=new P.Graphics();app.stage.addChild(this.trails);
  const sprite=(t,ax=.5,ay=.5)=>{const s=new P.Sprite(this.tex[t]);s.anchor.set(ax,ay);app.stage.addChild(s);return s};
  this.desks=C.cities.map(()=>{const s=sprite('desk',.5,1);s.scale.set(80/this.tex.desk.width);return s});
  this.bases=C.bases.map(()=>{const s=sprite('base',.5,1);s.scale.set(112/this.tex.base.width);return s});
  this.layers={};for(const k of ['heads','flyers','bursts'])this.layers[k]=new P.Container(),app.stage.addChild(this.layers[k]);
  this.cross=sprite('crosshair');this.cross.scale.set(34/this.tex.crosshair.width);
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'});
  this.hud=new P.Container();app.stage.addChild(this.hud);
  const text=(size,ax=.5,ay=0)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,ay);this.hud.addChild(t);return t};
  this.scoreText=text(52,0);this.waveText=text(22,1);this.bestText=text(22);this.ammoText=C.bases.map(()=>text(22,.5,0));this.message=text(52,.5,.5);this.sub=text(30,.5,.5);
  this.onKey=e=>this.key(e,true);this.offKey=e=>this.key(e,false);addEventListener('keydown',this.onKey);addEventListener('keyup',this.offKey);this.touch=g.No2TouchPad?.(this,app.canvas,W,H)||{fingers:new Map(),stick:()=>({x:0,y:0,d:0}),dir4:()=>null,take:k=>k==='twos'?0:[]};this.onBlur=()=>{this.held={}};addEventListener('blur',this.onBlur);
  // Mouse or touch: the crosshair follows the pointer; a click fires from the nearest base.
  this.onMove=e=>{if(!this.inputEnabled())return;const r=app.canvas.getBoundingClientRect();this.aim={x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}};
  this.onDown=e=>{if(!this.inputEnabled()||e.button>0)return;this.onMove(e);if(this.mode==='play'||this.mode==='demo')this.fires.fireNearest=true};
  app.canvas.addEventListener('pointermove',this.onMove);app.canvas.addEventListener('pointerdown',this.onDown);
  this.tracing=await g.No2Tracing?.attach(P,app,this.hud,{quiet:[this.message,this.sub]});this.newGame(this.seed);app.ticker.add(t=>this.frame(t.deltaMS/1000));return this}
 inputEnabled(){return !g.No2||g.No2.gameInputEnabled?.()!==false}
 // A key let go while a dialog has the input still counts as let go, so nothing stays held after it closes.
 key(e,down){if(!this.inputEnabled()){if(!down)this.held={};return}const k=e.key;
  // Initials: letters typed on the keyboard go straight in (owner 2026-10-25), so no letter moves or pauses here.
  if(this.mode==='initials'){if(down){e.preventDefault();if(!e.repeat||k.startsWith('Arrow'))this.edge(k)}return}
  if(down&&(k==='p'||k==='P')){this.pause();e.preventDefault();return}
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){this.held[name]=down;this.aim=null;e.preventDefault()}
  if(FIRE[k]){e.preventDefault();if(down&&!e.repeat&&this.armed)this.fires[FIRE[k]]=true}
  if(down&&!e.repeat)this.edge(k)}
 edge(k){if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller: the stick moves the crosshair like the cabinet's trackball; LT, A and RT fire from the left, centre and right bases; Menu pauses.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,dz=v=>Math.abs(v)<.15?0:Math.sign(v)*Math.min(1,(Math.abs(v)-.15)/.75);
   now.x=dz(p.axes[0]||0)+(b(15)?1:0)-(b(14)?1:0);now.y=dz(p.axes[1]||0)+(b(13)?1:0)-(b(12)?1:0);now.l=(p.buttons[6]?.value||0)>.5;now.a=b(0);now.r=(p.buttons[7]?.value||0)>.5;now.pause=b(9);now.up=b(12)||(p.axes[1]||0)<-.5;now.down=b(13)||(p.axes[1]||0)>.5}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='play'||this.mode==='demo'){if(!now.l&&!now.a&&!now.r)this.armed=true;if(this.armed){if(now.l&&!this.pad.l)this.fires.fireLeft=true;if(now.a&&!this.pad.a)this.fires.fireCentre=true;if(now.r&&!this.pad.r)this.fires.fireRight=true}if(now.x||now.y)this.aim=null}
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.a&&!this.pad.a)this.edge(' ')}
  this.pad=now}
 input(){const h=this.held,p=this.pad,out={x:((h.right?1:0)-(h.left?1:0))||p.x||0,y:((h.down?1:0)-(h.up?1:0))||p.y||0,...this.fires};if(this.aim)out.aim=this.aim;this.fires={};return out}
 newGame(seed=this.seed){this.seed=seed;this.engine=new SpitballCommandCore.MissileEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,SpitballCommandCore)||null;this.paused=false;this.fires={};if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   if(this.engine.state==='end')this.endGame()}
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(ev.type==='wave')this.waveAt=e.clock;if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 pool(layer,n,t){const list=layer.children;while(list.length<n){const s=new this.P.Sprite(this.tex[t]);s.anchor.set(.5);layer.addChild(s)}list.forEach((s,i)=>s.visible=i<n);return list}
 render(){const e=this.engine,T=this.tex,tr=this.trails;tr.clear();
  e.cities.forEach((c,i)=>{const s=this.desks[i];s.texture=c.alive?T.desk:T['desk-down'];s.position.set(c.x,C.groundY+4)});
  e.bases.forEach((b,i)=>{const s=this.bases[i];s.texture=b.alive?T.base:T['base-down'];s.position.set(b.x,C.groundY+4);const t=this.ammoText[i];t.text=b.alive?(b.ammo?String(b.ammo):'out'):'';t.position.set(b.x,C.groundY+10)});
  for(const m of e.incoming)tr.moveTo(m.x0,m.y0).lineTo(m.x,m.y);tr.stroke({width:2,color:0x7d8794,alpha:.75});
  for(const s of e.shots)tr.moveTo(s.x0,s.y0).lineTo(s.x,s.y);tr.stroke({width:2,color:0xd6a52a,alpha:.9});
  const heads=this.pool(this.layers.heads,e.incoming.length+e.shots.length,'spitball');e.incoming.forEach((m,i)=>{const s=heads[i];s.texture=T.spitball;s.scale.set((m.kind==="smart"?28:20)/T.spitball.width);s.tint=m.kind==='smart'?0xff9a9a:0xffffff;s.position.set(m.x,m.y)});
  e.shots.forEach((m,i)=>{const s=heads[e.incoming.length+i];s.texture=T.spitball;s.scale.set(11/T.spitball.width);s.tint=0xf2c94c;s.position.set(m.x,m.y)});
  const fl=this.pool(this.layers.flyers,e.flyers.length,'plane');e.flyers.forEach((f,i)=>{const s=fl[i];s.texture=f.kind==='bomber'?T.plane:T.frisbee;s.scale.set(58/s.texture.width);s.scale.x*=f.dir<0?-1:1;s.position.set(f.x,f.y)});
  const bs=this.pool(this.layers.bursts,e.bursts.length,'burst');e.bursts.forEach((b,i)=>{const s=bs[i],r=e.radius(b);s.scale.set(Math.max(.01,r*2.3/T.burst.width));s.position.set(b.x,b.y);s.rotation=b.t*2;s.alpha=b.own?1:.75});
  this.cross.position.set(e.cursor.x,e.cursor.y);this.cross.visible=e.state==='play'&&this.mode!=='initials'&&this.mode!=='over';
  this.scoreText.text=String(e.score).padStart(4,'0');this.waveText.text='wave '+e.wave+'   x'+e.multiplier();
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='the end.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  // As each wave starts the class is told what to defend and what the points are worth, like the cabinet's opening screen.
  else if(e.state==='play'&&e.clock-(this.waveAt??-9)<2.2&&!this.simPaused){msg='defend the desks!';sub=e.multiplier()+'x points'}
  else if(e.state==='between'&&e.lastBonus){const b=e.lastBonus;msg='bonus points '+b.bonus;sub=b.ammo+' spitballs left, '+b.cities+' desks standing, x'+b.multiplier}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(this.mode==='initials'||this.mode==='over'||e.state==='between');this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.waveText,this.bestText,...this.ammoText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  // A paper-coloured edge keeps a message readable where it shows over play without the tracing sheet.
  for(const t of [this.message,this.sub])t.style.stroke={color:0xf7f0e2,width:Math.max(3,Math.round(t.style.fontSize*.16)),join:'round'};
  this.scoreText.position.set(30,14);this.waveText.position.set(W-30,22);this.bestText.position.set(W/2,22);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.waveText,this.bestText,this.message,this.sub,...this.ammoText].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class MissileAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1980){if(this.api)return this.api;const frame=document.createElement('div');frame.id='missile-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new MissileGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>SpitballCommandTests.run(SpitballCommandCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 // A press that starts or resumes the page never fires: fire buttons count again once they are let go.
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.armed=false;this.game.fires={};this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);removeEventListener('blur',game.onBlur);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2SpitballCommand={Adapter:MissileAdapter,Game:MissileGame,art};
})(globalThis);
