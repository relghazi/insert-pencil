'use strict';
// Home Ec Scramble play page: runs BurgerCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over her recipe card: ballpoint girders and ladders, the little chef, running hot dogs, pickles and
// fried eggs, burger ingredients that sag where he steps and stack on blue-rimmed plates (home-ec-scramble-sprites).
(function(g){
const ID='home-ec-scramble',C=BurgerCore.CONFIG,W=C.width,H=C.height,INK=0x22355a,FY=C.floors,colX=BurgerCore.colX;
const art={"chef-run-a":"@@asset:assets/burgertime/chef-run-a.webp@@","chef-run-b":"@@asset:assets/burgertime/chef-run-b.webp@@","chef-climb-a":"@@asset:assets/burgertime/chef-climb-a.webp@@","chef-climb-b":"@@asset:assets/burgertime/chef-climb-b.webp@@","chef-pepper":"@@asset:assets/burgertime/chef-pepper.webp@@","chef-down":"@@asset:assets/burgertime/chef-down.webp@@","hotdog-a":"@@asset:assets/burgertime/hotdog-a.webp@@","hotdog-b":"@@asset:assets/burgertime/hotdog-b.webp@@","hotdog-climb":"@@asset:assets/burgertime/hotdog-climb.webp@@","hotdog-stun":"@@asset:assets/burgertime/hotdog-stun.webp@@","pickle-a":"@@asset:assets/burgertime/pickle-a.webp@@","pickle-b":"@@asset:assets/burgertime/pickle-b.webp@@","pickle-climb":"@@asset:assets/burgertime/pickle-climb.webp@@","pickle-stun":"@@asset:assets/burgertime/pickle-stun.webp@@","egg-a":"@@asset:assets/burgertime/egg-a.webp@@","egg-b":"@@asset:assets/burgertime/egg-b.webp@@","egg-climb":"@@asset:assets/burgertime/egg-climb.webp@@","egg-stun":"@@asset:assets/burgertime/egg-stun.webp@@","icecream":"@@asset:assets/burgertime/icecream.webp@@","coffee":"@@asset:assets/burgertime/coffee.webp@@","fries":"@@asset:assets/burgertime/fries.webp@@","shaker":"@@asset:assets/burgertime/shaker.webp@@","top":"@@asset:assets/burgertime/top.webp@@","lettuce":"@@asset:assets/burgertime/lettuce.webp@@","cheese":"@@asset:assets/burgertime/cheese.webp@@","patty":"@@asset:assets/burgertime/patty.webp@@","tomato":"@@asset:assets/burgertime/tomato.webp@@","bottom":"@@asset:assets/burgertime/bottom.webp@@","plates":"@@asset:assets/burgertime/plates.webp@@","cloud":"@@asset:assets/burgertime/cloud.webp@@","crumbs":"@@asset:assets/burgertime/crumbs.webp@@"};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ',FOOD_W=136,QW=FOOD_W/4;
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],up:['ArrowUp','w','W'],down:['ArrowDown','s','S'],fire:[' ']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: footsteps across the buns, the thump of a drop, the pepper's sneeze, squashes and the plate.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.beat=0;this.note=0}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('home-ec-scramble',e))return;
  if(e.type==='step')b.tone(520,.04,.02,'square');
  else if(e.type==='release')for(let i=0;i<4;i++)b.tone(700-i*110,.06,.022,'square',i*.05);
  else if(e.type==='drop')b.tone(140,.08,.035,'triangle');
  else if(e.type==='pepper')b.noise(.22,2600,.04);
  else if(e.type==='stun')b.tone(1200,.05,.02,'sine');
  else if(e.type==='crush')b.noise(.15,900,.06);
  else if(e.type==='carry'||e.type==='bonus')for(let i=0;i<4;i++)b.tone(660+i*220,.07,.03,'square',i*.07);
  else if(e.type==='bonusIn')for(let i=0;i<3;i++)b.tone(1047+i*262,.05,.025,'triangle',i*.06);
  else if(e.type==='burger')for(let i=0;i<3;i++)b.tone(880,.06,.03,'triangle',i*.08);
  else if(e.type==='cleared')for(let i=0;i<8;i++)b.tone([523,659,784,1047][i%4],.09,.03,'square',i*.1);
  else if(e.type==='death')for(let i=0;i<10;i++)b.tone(600-i*45,.08,.03,'square',i*.08);
  else if(e.type==='extra')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09)}
 // A little walking tune while the chef moves.
 loop(engine,dt){if(!this.on()||engine.state!=='play'||!engine.chef.walking)return;this.beat-=dt;if(this.beat<=0){this.beat=.14;const tune=[392,440,494,523,494,440];this.bus.gameTone('home-ec-scramble','walk-voice',tune[this.note++%tune.length],.08,.012,'triangle')}}
}

class ScrambleGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.sounds=new Sounds(services);this.puffs=[]}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const [k,v] of Object.entries(art))this.tex[k]=await texture(P,v);
  // One scale for every character (they were drawn the same size); each ingredient is cut into four quarters that sag on their own.
  this.k={char:70/this.tex['chef-run-a'].height,item:44/this.tex.icecream.height};
  this.quarters={};for(const kind of ['top','lettuce','cheese','patty','tomato','bottom']){const t=this.tex[kind],w=t.width/4;this.quarters[kind]=[0,1,2,3].map(i=>new P.Texture({source:t.source,frame:new P.Rectangle(i*w,0,w,t.height)}))}
  // Only the top plates of her plate stack fit under the bottom floor: cut between two rims, so the stack runs off the page edge instead of stopping in mid-air.
  {const t=this.tex.plates;this.plateTop=new P.Texture({source:t.source,frame:new P.Rectangle(0,0,t.width,Math.round(t.height*.62))})}
  const layer=()=>{const c=new P.Container();app.stage.addChild(c);return c};
  this.board=new P.Graphics();app.stage.addChild(this.board);this.plateLayer=layer();this.pieceLayer=layer();this.itemLayer=layer();this.enemyLayer=layer();
  const sprite=(t,ax=.5,ay=.5)=>{const s=new P.Sprite(this.tex[t]);s.anchor.set(ax,ay);app.stage.addChild(s);return s};
  this.player=sprite('chef-run-a',.5,1);this.cloud=sprite('cloud');this.fxLayer=layer();
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
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){this.held[name]=down;if(down&&name==='fire')this.tap=true;e.preventDefault()}
  if(down&&!e.repeat)this.edge(k)}
 // For a moment after the game ends a button still being mashed neither types initials nor restarts.
 edge(k){if(this.endHold>0)return;if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller: stick (with a dead zone) or D-pad walks and climbs; A shakes the pepper; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0,dz=v=>Math.abs(v)<.2?0:Math.sign(v)*Math.min(1,(Math.abs(v)-.2)/.7);
   now.axis=dz(x);now.axisY=dz(y);now.left=b(14);now.right=b(15);now.up=b(12)||y<-.5;now.down=b(13)||y>.5;now.dup=b(12);now.ddown=b(13);now.fire=b(0);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.fire&&!this.pad.fire)this.edge(' ')}
  this.pad=now}
 // A tap shorter than a frame still counts once (latched on keydown).
 // Fire counts only once it has been let go since play resumed, so the A that starts the page does not shake pepper.
 // Touch: drag to walk and climb; a tap peppers.
 input(){const pad=this.pad,h=this.held,s=this.touch.stick(),fire=!!(h.fire||pad.fire||this.tap||this.touch.take('taps').length);this.tap=false;if(!fire)this.fireArmed=true;
  const kx=(h.right||pad.right?1:0)-(h.left||pad.left?1:0),ky=(h.down||pad.ddown?1:0)-(h.up||pad.dup?1:0);const q=a=>Math.abs(a)>.3?Math.sign(a):0;return{axis:q(kx||pad.axis||s.x),axisY:q(ky||pad.axisY||s.y),fire:fire&&this.fireArmed}}
 newGame(seed=this.seed){this.seed=seed;this.engine=new BurgerCore.BurgerEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,BurgerCore)||null;this.paused=false;this.puffs=[];this.boardFor=null;if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);if(this.endHold>0)this.endHold-=dt;this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);if(this.engine.state==='end')this.endGame()}
  for(const f of this.puffs)f.life-=dt;this.puffs=this.puffs.filter(f=>f.life>0);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(['crush','carry','bonus'].includes(ev.type))this.puffs.push({x:ev.x,y:ev.y,life:.8,size:ev.type==='bonus'?40:70,text:String(ev.points)});
   if(ev.type==='death')this.puffs.push({x:ev.x,y:ev.y-30,life:1,size:90});
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}this.endHold=.9;const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 pool(layer,list,n,t){while(list.length<n){const s=new this.P.Sprite(this.tex[t]);s.anchor.set(.5);layer.addChild(s);list.push(s)}list.forEach((s,i)=>s.visible=i<n);return list}
 // Girders and ladders in ballpoint, redrawn when the stage changes.
 drawBoard(){const e=this.engine,L=e.layout,b=this.board;this.boardFor=L;b.clear();
  for(const [c,a,z] of L.ladders){const x=colX(c),y0=FY[a],y1=FY[z];b.moveTo(x-11,y0).lineTo(x-11,y1).moveTo(x+11,y0).lineTo(x+11,y1);for(let y=y0+14;y<y1;y+=14)b.moveTo(x-11,y).lineTo(x+11,y)}
  b.stroke({width:2.5,color:0x2f5bb7,alpha:.9});
  L.floors.forEach((segs,f)=>{for(const [a,z] of segs)b.rect(colX(a)-16,FY[f],colX(z)-colX(a)+32,9)});b.fill({color:0xc8d4ea,alpha:.9}).stroke({width:2,color:INK,alpha:.85});
  for(const p of this.plateLayer.removeChildren())p.destroy();
  for(const c of L.burgers){const s=new this.P.Sprite(this.plateTop);s.anchor.set(.5,.14);s.scale.set((FOOD_W+24)/s.texture.width);s.position.set(c*C.tile+C.pieceW/2,C.plateY);this.plateLayer.addChild(s)}}
 render(){const e=this.engine,T=this.tex,run=Math.floor(e.clock*8)%2;if(this.boardFor!==e.layout)this.drawBoard();
  // Ingredients: four quarters each, a quarter sinking a little once the chef has stepped on it.
  const qs=this.pool(this.pieceLayer,this.pieceSprites??=[],e.pieces.length*4,'top');
  e.pieces.forEach((pc,j)=>{const q=this.quarters[pc.kind],k=FOOD_W/T[pc.kind].width;for(let i=0;i<4;i++){const s=qs[j*4+i];if(s.texture!==q[i])s.texture=q[i];s.anchor.set(0,1);s.scale.set(k);s.position.set(pc.x-4+i*QW,pc.y+3+(pc.steps[i]?7:0))}});
  // Enemies: two running steps facing the way they go, a back view on ladders, sneezing when peppered; riders stand on their ingredient.
  const live=e.enemies.filter(x=>x.state==='walk'||x.state==='ride'),es=this.pool(this.enemyLayer,this.enemySprites??=[],live.length,'hotdog-a');
  live.forEach((x,i)=>{const s=es[i],t=x.stun>0?x.kind+'-stun':x.dy&&x.state==='walk'?x.kind+'-climb':x.kind+(run?'-a':'-b');if(s.texture!==T[t])s.texture=T[t];s.anchor.set(.5,1);
   s.scale.set(this.k.char*(x.dx<0&&!x.dy?-1:1),this.k.char);s.position.set(x.x,x.y+(x.state==='ride'?-18:3))});
  const items=[];if(e.bonus)items.push([e.bonus.kind,e.bonus.x,e.bonus.y+2,e.bonus.t<2&&run]);const is=this.pool(this.itemLayer,this.itemSprites??=[],items.length,'icecream');
  items.forEach(([t,x,y,blink],i)=>{const s=is[i];if(s.texture!==T[t])s.texture=T[t];s.anchor.set(.5,1);s.scale.set(this.k.item);s.position.set(x,y);s.alpha=blink?.4:1});
  const p=e.chef,f=FY.indexOf(p.y),dead=e.state==='dead'||e.state==='end';
  const step=Math.floor(e.clock*(p.walking?8:0))%2,ct=dead?'chef-down':e.cloud?'chef-pepper':f<0?(Math.floor(p.y/14)%2?'chef-climb-a':'chef-climb-b'):(step?'chef-run-a':'chef-run-b');
  this.player.texture=T[ct];this.player.scale.set(this.k.char*(p.face<0&&(ct.startsWith('chef-run')||ct==='chef-pepper'&&FY.includes(p.y))?-1:1),this.k.char);this.player.position.set(p.x,p.y+3);this.player.visible=!dead||Math.floor(e.clock*6)%2===0||e.state==='end';
  this.cloud.visible=!!e.cloud;if(e.cloud){this.cloud.position.set(e.cloud.x,e.cloud.y-26);this.cloud.scale.set(76/this.cloud.texture.width*(1.1-e.cloud.t))}
  const puffs=this.pool(this.fxLayer,this.puffSprites??=[],this.puffs.length,'crumbs');this.puffs.forEach((f,i)=>{const s=puffs[i];s.position.set(f.x,f.y);s.scale.set(f.size/s.texture.width);s.alpha=Math.min(1,f.life*4)});
  const hitText=this.puffs.find(f=>f.text);this.pointsText.text=hitText?hitText.text:'';if(hitText)this.pointsText.position.set(hitText.x,hitText.y-50);
  this.scoreText.text=String(e.score).padStart(4,'0');this.livesText.text='lives '+Math.max(0,e.lives)+'   pepper '+e.pepper+'   stage '+e.stage;
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='final grade.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  else if(e.state==='cleared'){msg='order up.'}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.livesText,this.bestText,this.pointsText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  this.scoreText.position.set(32,4);this.livesText.position.set(W-32,14);this.bestText.position.set(W/2,14);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.livesText,this.bestText,this.pointsText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class ScrambleAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1982){if(this.api)return this.api;const frame=document.createElement('div');frame.id='home-ec-scramble-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new ScrambleGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>BurgerTests.run(BurgerCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.held={};this.game.fireArmed=false;this.game.tap=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);removeEventListener('blur',game.onBlur);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2HomeEcScramble={Adapter:ScrambleAdapter,Game:ScrambleGame,art};
})(globalThis);
