'use strict';
// Mystery Meat Time play page: runs FoodFightCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over her cafeteria menu paper: the boy in blue, four angry cafeteria chefs with their own toques,
// piles of peas, pies, tomatoes, bananas and watermelons, manholes and the melting cone (mystery-meat-time-sprites, -chefs).
(function(g){
const ID='mystery-meat-time',C=FoodFightCore.CONFIG,W=C.width,H=C.height,INK=0x22355a;
const names=['run-a','run-b','throw','dead','eat','oscar','angelo','jacques','zorba','chef-down','pile-peas','pile-pie','pile-tomato','pile-banana','pile-melon','cone-0','cone-1','cone-2','pie','tomato','banana','melon','peas','splat','hole-shut','hole-open'];
const art={"run-a":"@@asset:assets/foodfight/run-a.webp@@","run-b":"@@asset:assets/foodfight/run-b.webp@@",throw:"@@asset:assets/foodfight/throw.webp@@",dead:"@@asset:assets/foodfight/dead.webp@@",eat:"@@asset:assets/foodfight/eat.webp@@",oscar:"@@asset:assets/foodfight/oscar.webp@@",angelo:"@@asset:assets/foodfight/angelo.webp@@",jacques:"@@asset:assets/foodfight/jacques.webp@@",zorba:"@@asset:assets/foodfight/zorba.webp@@","chef-down":"@@asset:assets/foodfight/chef-down.webp@@","pile-peas":"@@asset:assets/foodfight/pile-peas.webp@@","pile-pie":"@@asset:assets/foodfight/pile-pie.webp@@","pile-tomato":"@@asset:assets/foodfight/pile-tomato.webp@@","pile-banana":"@@asset:assets/foodfight/pile-banana.webp@@","pile-melon":"@@asset:assets/foodfight/pile-melon.webp@@","cone-0":"@@asset:assets/foodfight/cone-0.webp@@","cone-1":"@@asset:assets/foodfight/cone-1.webp@@","cone-2":"@@asset:assets/foodfight/cone-2.webp@@",pie:"@@asset:assets/foodfight/pie.webp@@",tomato:"@@asset:assets/foodfight/tomato.webp@@",banana:"@@asset:assets/foodfight/banana.webp@@",melon:"@@asset:assets/foodfight/melon.webp@@",peas:"@@asset:assets/foodfight/peas.webp@@",splat:"@@asset:assets/foodfight/splat.webp@@","hole-shut":"@@asset:assets/foodfight/hole-shut.webp@@","hole-open":"@@asset:assets/foodfight/hole-open.webp@@"};
// On-screen sizes (logical px): the long side of each thing.
const BODY=26,SIZE={pie:34,tomato:26,banana:32,melon:52,peas:22,pile:66,hole:64};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],up:['ArrowUp','w','W'],down:['ArrowDown','s','S'],fire:[' ']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: throws, splats, a chef down, a chef in a manhole, the cone, and a tick as the cone runs low.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.beat=0}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('mystery-meat-time',e))return;
  if(e.type==='throw')e.owner==='chef'?b.tone(420,.06,.015,'triangle'):b.tone(e.kind==='peas'?1400:900,.04,.02,'square');
  else if(e.type==='hit')for(let i=0;i<3;i++)b.tone(500+i*180+e.chain*40,.06,.03,'square',i*.05);
  else if(e.type==='splat')b.noise(.08,900,.025);
  else if(e.type==='pickup')b.tone(660,.05,.02,'triangle');
  else if(e.type==='manhole')for(let i=0;i<8;i++)b.tone(900-i*90,.06,.025,'sine',i*.05);
  else if(e.type==='emerge')b.tone(160,.15,.02,'sawtooth');
  else if(e.type==='death')b.noise(.9,300,.09);
  else if(e.type==='cone')for(let i=0;i<6;i++)b.tone(660+i*110,.08,.035,'square',i*.08);
  else if(e.type==='extra')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09)}
 loop(engine,dt){if(!this.on()||engine.state!=='play'||engine.melt>10)return;this.beat-=dt;if(this.beat<=0){this.beat=engine.melt>5?.5:.25;this.bus.gameTone('mystery-meat-time','tick-voice',1200,.03,.015,'sine')}}
}

class MysteryMeatGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.sounds=new Sounds(services);this.puffs=[];this.throwT=0}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const k of names)this.tex[k]=await texture(P,art[k]);
  // One scale per family: the boy by his running frame, the chefs by Angelo, piles, food and holes by their long side.
  const T=this.tex,long=t=>Math.max(t.width,t.height);
  this.k={boy:76/T['run-a'].height,chef:84/T.angelo.height,pile:SIZE.pile/long(T['pile-pie']),hole:SIZE.hole/T['hole-shut'].width,cone:96/T['cone-0'].height};
  const layer=()=>{const c=new P.Container();app.stage.addChild(c);return c};
  this.floor=layer();this.pileLayer=layer();this.actors=layer();this.actors.sortableChildren=true;this.foodLayer=layer();this.fxLayer=layer();
  // Play area: a thin ballpoint frame on the menu paper.
  this.frameG=new P.Graphics().roundRect(C.left-14,C.top-14,C.right-C.left+28,C.bottom-C.top+28,14).stroke({width:3,color:INK,alpha:.55});this.floor.addChild(this.frameG);
  const sprite=(t,parent)=>{const s=new P.Sprite(this.tex[t]);s.anchor.set(.5);parent.addChild(s);return s};
  this.cone=sprite('cone-0',this.actors);this.cone.anchor.set(.5,.85);this.player=sprite('run-a',this.actors);this.player.anchor.set(.5,.82);
  this.meltBar=new P.Graphics();this.floor.addChild(this.meltBar);
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'});
  this.hud=layer();const text=(size,ax=.5,ay=0)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,ay);this.hud.addChild(t);return t};
  // The score line sits between the menu card's printed border and the play frame, never on the border (2026-10-29).
  this.scoreText=text(46,0);this.livesText=text(22,1);this.bestText=text(22);this.pointsText=text(22);this.message=text(52,.5,.5);this.sub=text(30,.5,.5);
  this.onKey=e=>this.key(e,true);this.offKey=e=>this.key(e,false);addEventListener('keydown',this.onKey);addEventListener('keyup',this.offKey);this.touch=g.No2TouchPad?.(this,app.canvas,W,H)||{fingers:new Map(),stick:()=>({x:0,y:0,d:0}),dir4:()=>null,take:k=>k==='twos'?0:[]};
  this.tracing=await g.No2Tracing?.attach(P,app,this.hud,{quiet:[this.message,this.sub]});this.newGame(this.seed);app.ticker.add(t=>this.frame(t.deltaMS/1000));return this}
 inputEnabled(){return !g.No2||g.No2.gameInputEnabled?.()!==false}
 key(e,down){if(!this.inputEnabled())return;const k=e.key;
  // Initials: letters typed on the keyboard go straight in (owner 2026-10-25), so no letter moves or pauses here.
  if(this.mode==='initials'){if(down){e.preventDefault();if(!e.repeat||k.startsWith('Arrow'))this.edge(k)}return}
  if(down&&(k==='p'||k==='P')){this.pause();e.preventDefault();return}
  // A tap shorter than a frame still counts: it is kept for the next step.
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){this.held[name]=down;if(down&&!e.repeat&&name==='fire')this.tapped=true;e.preventDefault()}
  if(down&&!e.repeat)this.edge(k)}
 edge(k){if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller: stick (analog, with a dead zone) or D-pad walks and aims in eight directions; A throws; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0,dz=v=>Math.abs(v)<.2?0:Math.sign(v)*Math.min(1,(Math.abs(v)-.2)/.7);
   now.axis=dz(x);now.axisY=dz(y);now.left=b(14);now.right=b(15);now.up=b(12)||y<-.5;now.down=b(13)||y>.5;now.dup=b(12);now.ddown=b(13);now.fire=b(0);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.fire&&!this.pad.fire)this.edge(' ')}
  this.pad=now}
 // Fire counts only once it has been let go since play resumed, so the A that starts the page does not throw.
 // Touch: drag to run and aim; a tap throws the way she faces.
 input(){const pad=this.pad,h=this.held,s=this.touch.stick(),fire=!!(h.fire||pad.fire||this.tapped||this.touch.take('taps').length);this.tapped=false;if(!fire)this.fireArmed=true;
  const kx=(h.right||pad.right?1:0)-(h.left||pad.left?1:0),ky=(h.down||pad.ddown?1:0)-(h.up||pad.dup?1:0);return{axis:kx||pad.axis||s.x,axisY:ky||pad.axisY||s.y,fire:fire&&this.fireArmed}}
 newGame(seed=this.seed){this.seed=seed;this.endHold=0;this.engine=new FoodFightCore.FoodFightEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,FoodFightCore)||null;this.paused=false;this.tapped=false;this.puffs=[];if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);// The last life's fall stays on screen for a moment before the end screen.
   if(this.engine.state==='end'&&(this.endHold+=dt)>=C.deathPause*.8)this.endGame()}
  this.throwT-=dt;for(const f of this.puffs)f.life-=dt;this.puffs=this.puffs.filter(f=>f.life>0);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(ev.type==='throw'&&ev.owner==='player')this.throwT=.18;
   if(ev.type==='splat')this.puffs.push({x:ev.x,y:ev.y-BODY,life:.3,size:ev.kind==='melon'?60:ev.kind==='peas'?20:36,tex:'splat'});
   if(ev.type==='hit'||ev.type==='manhole')this.puffs.push({x:ev.x,y:ev.y,life:.6,size:84,tex:ev.type==='hit'?'chef-down':'splat',text:String(ev.points)});
   if(ev.type==='cone')this.puffs.push({x:ev.x,y:ev.y-60,life:1.4,size:0,text:ev.bonus?ev.points+' + '+ev.bonus:String(ev.points)});
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 pool(layer,list,n,t){while(list.length<n){const s=new this.P.Sprite(this.tex[t]);s.anchor.set(.5);layer.addChild(s);list.push(s)}list.forEach((s,i)=>s.visible=i<n);return list}
 tx(s,k){const t=this.tex[k];if(s.texture!==t)s.texture=t}
 render(){const e=this.engine,T=this.tex,step=Math.floor(e.clock*8)%2;
  const hp=this.pool(this.floor,this.holeSprites??=[],e.holes.length,'hole-shut');e.holes.forEach((h,i)=>{const s=hp[i];this.tx(s,h.open>0?'hole-open':'hole-shut');s.scale.set(this.k.hole);s.position.set(h.x,h.y)});
  // Piles shrink as they are used up; the watermelon pile stays full.
  const piles=e.piles.filter(p=>p.count>0),pp=this.pool(this.pileLayer,this.pileSprites??=[],piles.length,'pile-pie');
  piles.forEach((p,i)=>{const s=pp[i];this.tx(s,'pile-'+p.kind);s.scale.set(this.k.pile*(p.count===Infinity?1:.55+.45*p.count/C.pileSize));s.position.set(p.x,p.y)});
  // Chefs: each by his own toque; a chef coming up rises out of his manhole.
  const live=e.chefs.filter(c=>c.state!=='wait'),cp=this.pool(this.actors,this.chefSprites??=[],live.length,'angelo');
  live.forEach((c,i)=>{const s=cp[i];this.tx(s,c.name==='angelo'?'angelo':c.name==='zorba'?'zorba':c.name==='oscar'?'oscar':'jacques');s.anchor.set(.5,.82);
   const rise=c.state==='rise'?1-Math.max(0,c.timer)/C.riseTime:1,flip=e.player.x<c.x?-1:1;s.scale.set(this.k.chef*flip*(.4+.6*rise),this.k.chef*(.4+.6*rise));s.alpha=.4+.6*rise;
   s.rotation=c.state==='walk'?Math.sin(e.clock*14+i)*.06:0;s.position.set(c.x,c.y);s.zIndex=c.y});
  // The cone slumps as it melts; a thin ballpoint bar under it counts down.
  const m=e.melt/C.meltTime;this.tx(this.cone,m>.5?'cone-0':m>.2?'cone-1':'cone-2');this.cone.scale.set(this.k.cone);this.cone.position.set(e.cone.x,e.cone.y);this.cone.zIndex=e.cone.y;this.cone.visible=e.state!=='cleared';
  this.meltBar.clear().rect(e.cone.x-30,e.cone.y+26,60,6).stroke({width:1.5,color:INK}).rect(e.cone.x-30,e.cone.y+26,60*m,6).fill({color:m>.2?INK:0xc0392b,alpha:.7});
  const p=e.player,pl=this.player,dead=e.state==='dead'||e.state==='end';this.tx(pl,dead?'dead':e.state==='cleared'?'eat':this.throwT>0?'throw':p.moving?(step?'run-b':'run-a'):'run-a');
  pl.anchor.set(.5,dead?.5:.82);pl.scale.set(this.k.boy*(p.face.x<0&&!dead?-1:1),this.k.boy);pl.position.set(p.x,p.y);pl.zIndex=p.y;
  // What he is carrying rides over his head.
  const carried=e.held&&!dead?[{x:p.x,y:p.y-74,kind:e.held.kind,spin:0}]:[];
  // Food in flight is drawn at chest height (the floor point less BODY), so it leaves the hand and lands on a body.
  const flying=[...e.food.map(f=>({x:f.x,y:f.y-BODY,kind:f.kind,spin:e.clock*(f.kind==='pie'||f.kind==='melon'?6:10)})),...carried,...e.chefs.filter(c=>c.carry&&c.state==='walk').map(c=>({x:c.x,y:c.y-82,kind:c.carry,spin:0}))];
  const fp=this.pool(this.foodLayer,this.foodSprites??=[],flying.length,'pie');
  flying.forEach((f,i)=>{const s=fp[i];this.tx(s,f.kind);s.scale.set(SIZE[f.kind]/Math.max(s.texture.width,s.texture.height));s.rotation=f.spin;s.position.set(f.x,f.y)});
  const puffs=this.puffs.filter(f=>f.size),xp=this.pool(this.fxLayer,this.puffSprites??=[],puffs.length,'splat');
  puffs.forEach((f,i)=>{const s=xp[i];this.tx(s,f.tex);s.position.set(f.x,f.y);s.scale.set(f.size/Math.max(s.texture.width,s.texture.height));s.alpha=Math.min(1,f.life*4)});
  const hitText=this.puffs.find(f=>f.text);this.pointsText.text=hitText?hitText.text:'';if(hitText)this.pointsText.position.set(hitText.x,hitText.y-60);
  this.scoreText.text=String(e.score).padStart(4,'0');this.livesText.text='lives '+Math.max(0,e.lives)+'   level '+e.level;
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='lunch is over.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  else if(e.state==='cleared'){msg='dessert first.'}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.livesText,this.bestText,this.pointsText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  // A paper-coloured edge keeps messages and points readable over the busy play field.
  for(const t of [this.message,this.sub,this.pointsText])t.style.stroke={color:0xf7f0e2,width:Math.max(3,Math.round(t.style.fontSize*.16)),join:'round'};
  this.scoreText.position.set(C.left,33);this.livesText.position.set(W-C.left,47);this.bestText.position.set(W/2,47);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.livesText,this.bestText,this.pointsText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class MysteryMeatAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1981){if(this.api)return this.api;const frame=document.createElement('div');frame.id='mystery-meat-time-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new MysteryMeatGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>FoodFightTests.run(FoodFightCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.fireArmed=false;this.game.tapped=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2MysteryMeatTime={Adapter:MysteryMeatAdapter,Game:MysteryMeatGame,art};
})(globalThis);
