'use strict';
// Dunce Kong play page: runs KongCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over her college-ruled paper: red girders and blue ladders, the gorilla in the dunce cap, wooden barrels,
// fireballs, cafeteria pies, springs, elevators, thumbtack rivets and the boy in blue (dunce-kong-sprites).
(function(g){
const ID='dunce-kong',C=KongCore.CONFIG,W=C.width,H=C.height,INK=0x22355a,D=KongCore.D,yAt=KongCore.yAt;
const names=['kong-stand','kong-pound','kong-throw','walk-a','hero-idle','hero-walk-1','hero-walk-2','hero-walk-3','hero-walk-4','hero-climb-1','hero-climb-2','hero-climb-3','hero-jump-up','hero-jump-fall','hero-hammer-up','hero-hammer-down','dead','barrel','barrel-up','barrel-blue','fire-a','fire-b','drum','pie','spring','pal','mallet','hat','umbrella','purse','tack','heart','girder','ladder','belt','lift'];
const art={"kong-stand":"@@asset:assets/donkeykong/kong-stand.webp@@","kong-pound":"@@asset:assets/donkeykong/kong-pound.webp@@","kong-throw":"@@asset:assets/donkeykong/kong-throw.webp@@","walk-a":"@@asset:assets/donkeykong/walk-a.webp@@","walk-b":"@@asset:assets/donkeykong/walk-b.webp@@",climb:"@@asset:assets/donkeykong/climb.webp@@",jump:"@@asset:assets/donkeykong/jump.webp@@",hammer:"@@asset:assets/donkeykong/hammer.webp@@",dead:"@@asset:assets/donkeykong/dead.webp@@",barrel:"@@asset:assets/donkeykong/barrel.webp@@","barrel-up":"@@asset:assets/donkeykong/barrel-up.webp@@","barrel-blue":"@@asset:assets/donkeykong/barrel-blue.webp@@","fire-a":"@@asset:assets/donkeykong/fire-a.webp@@","fire-b":"@@asset:assets/donkeykong/fire-b.webp@@",drum:"@@asset:assets/donkeykong/drum.webp@@",pie:"@@asset:assets/donkeykong/pie.webp@@",spring:"@@asset:assets/donkeykong/spring.webp@@",pal:"@@asset:assets/donkeykong/pal.webp@@",mallet:"@@asset:assets/donkeykong/mallet.webp@@",hat:"@@asset:assets/donkeykong/hat.webp@@",umbrella:"@@asset:assets/donkeykong/umbrella.webp@@",purse:"@@asset:assets/donkeykong/purse.webp@@",tack:"@@asset:assets/donkeykong/tack.webp@@",heart:"@@asset:assets/donkeykong/heart.webp@@",girder:"@@asset:assets/donkeykong/girder.webp@@",ladder:"@@asset:assets/donkeykong/ladder.webp@@",belt:"@@asset:assets/donkeykong/belt.webp@@",lift:"@@asset:assets/donkeykong/lift.webp@@","hero-idle":"@@asset:assets/donkeykong/hero-idle.webp@@","hero-walk-1":"@@asset:assets/donkeykong/hero-walk-1.webp@@","hero-walk-2":"@@asset:assets/donkeykong/hero-walk-2.webp@@","hero-walk-3":"@@asset:assets/donkeykong/hero-walk-3.webp@@","hero-walk-4":"@@asset:assets/donkeykong/hero-walk-4.webp@@","hero-climb-1":"@@asset:assets/donkeykong/hero-climb-1.webp@@","hero-climb-2":"@@asset:assets/donkeykong/hero-climb-2.webp@@","hero-climb-3":"@@asset:assets/donkeykong/hero-climb-3.webp@@","hero-jump-up":"@@asset:assets/donkeykong/hero-jump-up.webp@@","hero-jump-fall":"@@asset:assets/donkeykong/hero-jump-fall.webp@@","hero-hammer-up":"@@asset:assets/donkeykong/hero-hammer-up.webp@@","hero-hammer-down":"@@asset:assets/donkeykong/hero-hammer-down.webp@@"};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ',BEAM=D(8),FOOT=D(2);
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],up:['ArrowUp','w','W'],down:['ArrowDown','s','S'],fire:[' '],pepper:['Shift']/* the pepper shaker sticker (X on a controller) */};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: footsteps, the jump, the hammer tune, smashes, rivets, the bonus and the fall.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.beat=0;this.note=0}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('dunce-kong',e))return;
  if(e.type==='jump')b.tone(520,.12,.02,'square');
  else if(e.type==='jumpover')for(let i=0;i<3;i++)b.tone(880+i*220,.05,.025,'square',i*.05);
  else if(e.type==='smash')b.noise(.12,1800,.06);
  else if(e.type==='item'||e.type==='rivet')for(let i=0;i<3;i++)b.tone(1040+i*260,.05,.03,'square',i*.05);
  else if(e.type==='throw')b.tone(120,.12,.03,'triangle');
  else if(e.type==='fireball')b.noise(.25,600,.04);
  else if(e.type==='spring')b.tone(300,.08,.02,'sine');
  else if(e.type==='springDrop')for(let i=0;i<5;i++)b.tone(900-i*130,.06,.018,'sine',i*.06);
  else if(e.type==='bounce')b.tone(110,.05,.02,'triangle');
  else if(e.type==='hammer')for(let i=0;i<2;i++)b.tone(784+i*262,.06,.03,'square',i*.06);
  else if(e.type==='death')for(let i=0;i<8;i++)b.tone(900-i*90,.07,.03,'square',i*.08);
  else if(e.type==='cleared')for(let i=0;i<6;i++)b.tone([523,659,784,1047,784,1047][i],.1,.03,'square',i*.11);
  else if(e.type==='pepper')b.noise(.22,2600,.04);
  else if(e.type==='stunned')for(let i=0;i<3;i++)b.tone(1200+i*180,.05,.02,'sine',i*.05);
  else if(e.type==='extra')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09)}
 loop(engine,dt){if(!this.on()||engine.state!=='play')return;const p=engine.player;this.beat-=dt;if(this.beat>0)return;
  // The hammer tune while he holds it; otherwise his footsteps.
  if(p.hammer>0){this.beat=.14;this.note=(this.note+1)%8;this.bus.gameTone('dunce-kong','hammer-voice',[392,523,392,587,392,659,587,523][this.note],.1,.02,'square')}
  else if(p.moving&&p.state!=='air'){this.beat=p.state==='climb'?.22:.16;this.bus.gameTone('dunce-kong','step-voice',p.state==='climb'?260:200,.03,.012,'triangle')}}
}

class KongGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.sounds=new Sounds(services);this.puffs=[]}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const k of names)this.tex[k]=await texture(P,art[k]);
  // One scale per family: the boy, Kong, barrels and fire, the small things, the girders and ladders.
  const T=this.tex;this.k={hero:D(17)/T['walk-a'].height,kong:D(34)/T['kong-stand'].height,barrel:D(10)/T.barrel.height,fire:D(12)/T['fire-a'].height,beam:BEAM/T.girder.height,ladder:D(9)/T.ladder.width};
  const layer=()=>{const c=new P.Container();app.stage.addChild(c);return c};
  this.ladderLayer=layer();this.cables=new P.Graphics();app.stage.addChild(this.cables);this.beamLayer=layer();this.liftLayer=layer();this.thingLayer=layer();this.hazardLayer=layer();this.fx=new P.Graphics();app.stage.addChild(this.fx);
  const sprite=(t,ax=.5,ay=1)=>{const s=new P.Sprite(this.tex[t]);s.anchor.set(ax,ay);app.stage.addChild(s);return s};
  this.drum=sprite('drum');this.drumFire=sprite('fire-a');this.lady=sprite('pal');this.heart=sprite('heart');this.kong=sprite('kong-stand');this.player=sprite('walk-a');
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'});
  this.hud=layer();const text=(size,ax=.5,ay=0)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,ay);this.hud.addChild(t);return t};
  // The cabinet's screen is portrait, so the score sits in the margin on the left and lives, level and bonus on the right, like Snack-Man.
  this.scoreLabel=text(22);this.scoreText=text(52);this.livesText=text(22);this.levelText=text(22);this.bestText=text(22);this.bonusText=text(30);this.pepperText=text(22);this.pointsText=text(22);this.scoreLabel.text='score';this.message=text(52,.5,.5);this.sub=text(30,.5,.5);
  this.onKey=e=>this.key(e,true);this.offKey=e=>this.key(e,false);addEventListener('keydown',this.onKey);addEventListener('keyup',this.offKey);this.touch=g.No2TouchPad?.(this,app.canvas,W,H)||{fingers:new Map(),stick:()=>({x:0,y:0,d:0}),dir4:()=>null,take:k=>k==='twos'?0:[]};this.onBlur=()=>{this.held={}};addEventListener('blur',this.onBlur);
  this.tracing=await g.No2Tracing?.attach(P,app,this.hud,{quiet:[this.message,this.sub]});this.newGame(this.seed);app.ticker.add(t=>this.frame(t.deltaMS/1000));return this}
 inputEnabled(){return !g.No2||g.No2.gameInputEnabled?.()!==false}
 // A key let go while a dialog has the input still counts as let go, so nothing stays held after it closes.
 key(e,down){if(!this.inputEnabled()){if(!down)this.held={};return}const k=e.key;
  // Initials: letters typed on the keyboard go straight in, so no letter moves or pauses here.
  if(this.mode==='initials'){if(down){e.preventDefault();if(!e.repeat||k.startsWith('Arrow'))this.edge(k)}return}
  if(down&&(k==='p'||k==='P')){this.pause();e.preventDefault();return}
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){this.held[name]=down;if(down&&name==='fire')this.tap=true;if(down&&name==='pepper'&&!this.paused)this.shake=true;e.preventDefault()}
  if(down&&!e.repeat)this.edge(k)}
 // For a moment after the game ends a button still being mashed neither types initials nor restarts.
 edge(k){if(this.endHold>0)return;if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller: stick (with a dead zone) or D-pad walks and climbs; A jumps; X shakes the pepper (sticker runs); Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0,dz=v=>Math.abs(v)<.3?0:Math.sign(v);
   now.axis=dz(x);now.axisY=dz(y);now.left=b(14);now.right=b(15);now.up=b(12)||y<-.5;now.down=b(13)||y>.5;now.dup=b(12);now.ddown=b(13);now.fire=b(0);now.pepper=b(2);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.fire&&!this.pad.fire)this.edge(' ')}
  if(now.pepper&&!this.pad.pepper&&!this.paused)this.shake=true;this.pad=now}
 // A tap shorter than a frame still counts once (latched on keydown).
 // Jump counts only once it has been let go since play resumed, so the A that starts the page does not jump.
 // Touch: drag to walk and climb; a tap jumps.
 input(){const pad=this.pad,h=this.held,s=this.touch.stick(),jump=!!(h.fire||pad.fire||this.tap||this.touch.take('taps').length),pepper=!!(h.pepper||pad.pepper||this.shake);this.tap=false;this.shake=false;if(!jump)this.fireArmed=true;if(!pepper)this.pepperArmed=true;
  const kx=(h.right||pad.right?1:0)-(h.left||pad.left?1:0),ky=(h.down||pad.ddown?1:0)-(h.up||pad.dup?1:0);return{axis:Math.sign(kx||pad.axis||s.x),axisY:Math.sign(ky||pad.axisY||s.y),jump:jump&&this.fireArmed,pepper:pepper&&!!this.pepperArmed}}
 newGame(seed=this.seed){this.seed=seed;this.engine=new KongCore.KongEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,KongCore)||null;this.paused=false;this.puffs=[];this.structKey=null;if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo'){this.paused=!this.paused;/* no shake waits through a pause (review) */this.shake=false;this.pepperArmed=false}}
 frame(dt){dt=Math.min(dt,.1);if(this.endHold>0)this.endHold-=dt;this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);if(this.engine.state==='end')this.endGame()}
  for(const f of this.puffs)f.life-=dt;this.puffs=this.puffs.filter(f=>f.life>0);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(['jumpover','smash','item'].includes(ev.type))this.puffs.push({x:ev.x,y:ev.y,life:.9,text:String(ev.points)});
   if(ev.type==='rivet')this.puffs.push({x:ev.x,y:ev.y-D(14),life:.9,text:'100'});
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}this.endHold=.9;const score=this.engine.score,save=this.services.save,rows=g.No2Scores.rows(save,ID,this.seed);
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');g.No2Scores.add(save,ID,this.seed,name,it.score);g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 pool(layer,list,n,t){while(list.length<n){const s=new this.P.Sprite(this.tex[t]);s.anchor.set(.5,1);layer.addChild(s);list.push(s)}list.forEach((s,i)=>s.visible=i<n);return list}
 // Feet anchored at the bottom sink onto the drawn girder: the girder art starts a little below its walking line and every sprite has a soft margin under it.
 put(s,t,x,y,k,flip=false,ax=.5,ay=1){if(s.texture!==this.tex[t])s.texture=this.tex[t];s.anchor.set(ax,ay);s.scale.set(flip?-k:k,k);s.position.set(x,ay===1?y+FOOT:y);s.rotation=0;s.visible=true;return s}
 // Girders and belts: tiles laid along each platform, tilted to its slope, top edge on the walking surface.
 beam(q,t){const L=Math.hypot(q.x2-q.x1,q.y2-q.y1),tw=this.tex[t].width*this.k.beam,n=Math.max(1,Math.round(L/tw)),a=Math.atan2(q.y2-q.y1,q.x2-q.x1),s=L/n/this.tex[t].width;
  for(let i=0;i<n;i++){const o=new this.P.Sprite(this.tex[t]);o.anchor.set(0,0);o.scale.set(s+.002,this.k.beam);o.rotation=a;o.position.set(q.x1+(q.x2-q.x1)*i/n,q.y1+(q.y2-q.y1)*i/n);this.beamLayer.addChild(o)}}
 // Ladders: rung tiles from the lower surface up to the upper girder; broken ones miss their middle, sliding ones lose their foot.
 ladder(l,parts){const tile=this.tex.ladder,k=this.k.ladder,len=l.bot-l.top+BEAM,th=tile.height*k;
  const draw=(y0,y1)=>{const h=y1-y0;if(h<=4)return;const n=Math.max(1,Math.round(h/th)),sy=h/n/tile.height;for(let i=0;i<n;i++){const o=new this.P.Sprite(tile);o.anchor.set(.5,0);o.scale.set(k,sy);o.position.set(l.x,y0+i*h/n);parts.addChild(o)}};
  const top=l.top+BEAM*.5;if(l.broken){draw(top,top+len*.3);draw(l.bot-len*.3,l.bot)}else draw(top,l.bot)}
 structure(e){const key=e.screen+'|'+e.level+'|'+(e.rivets?e.rivets.filter(r=>r.alive).length:'')+'|'+e.plats.length;if(key===this.structKey&&this.structEngine===e)return;this.structKey=key;this.structEngine=e;
  for(const c of [this.ladderLayer,this.beamLayer])c.removeChildren().forEach(o=>o.destroy());
  for(const l of e.ladders)if(!l.retract)this.ladder(l,this.ladderLayer);
  for(const q of e.plats)this.beam(q,q.belt?'belt':'girder');
  // Elevator shafts: two ink cables down each side.
  const c=this.cables.clear();for(const id of ['A','B']){const l=e.lifts.find(x=>x.lift===id);if(!l)continue;for(const x of [l.x1+D(3),l.x2-D(3)])c.moveTo(x,KongCore.py(96)).lineTo(x,KongCore.py(256))}c.stroke({width:2,color:INK,alpha:.7})}
 render(){const e=this.engine,T=this.tex,k=this.k,t=e.clock,flick=Math.floor(t*8)%2;this.structure(e);
  // Sliding ladders on 50m, redrawn as they move.
  this.slide??=new this.P.Container();if(!this.slide.parent)this.ladderLayer.parent.addChildAt(this.slide,this.app.stage.getChildIndex(this.ladderLayer)+1);this.slide.removeChildren().forEach(o=>o.destroy());
  for(const l of e.ladders)if(l.retract){const open=e.ladderOpen(l),len=l.bot-l.top;this.ladder(open?l:{...l,bot:l.top+len*.45},this.slide)}
  const lifts=this.pool(this.liftLayer,this.liftSprites??=[],e.lifts.length,'lift');e.lifts.forEach((l,i)=>this.put(lifts[i],'lift',(l.x1+l.x2)/2,l.y1,(l.x2-l.x1)/T.lift.width,false,.5,0));
  // Hammers, items and rivets (her thumbtacks).
  const things=[...e.hammers.filter(h=>h.alive).map(h=>['mallet',h.x,h.y+D(6)]),...e.items.filter(i=>i.alive).map(i=>[i.kind,i.x,i.y]),...(e.rivets||[]).filter(r=>r.alive&&e.screen===100).map(r=>['tack',r.x,r.y+D(2)])];
  const tp=this.pool(this.thingLayer,this.thingSprites??=[],things.length,'hat');things.forEach(([n,x,y],i)=>this.put(tp[i],n,x,y,D({mallet:14,tack:9,umbrella:17,hat:11,purse:12}[n])/Math.max(T[n].width,T[n].height)));
  this.drum.visible=this.drumFire.visible=!!e.drum;if(e.drum){this.put(this.drum,'drum',e.drum.x,e.drum.y,D(16)/T.drum.height);this.put(this.drumFire,flick?'fire-a':'fire-b',e.drum.x,e.drum.y-D(14),D(10)/T['fire-a'].height)}
  this.put(this.lady,'pal',e.lady.x,e.lady.y,D(22)/T.pal.height,e.player.x>e.lady.x);this.heart.visible=e.state==='cleared'&&e.screen!==100;if(this.heart.visible)this.put(this.heart,'heart',e.lady.x+D(14),e.lady.y-D(18),D(10)/T.heart.height);
  // Kong: throws, pounds his chest, and falls off the girders when the last rivet goes.
  const kg=e.kong,pose=kg.pose==='throw'?'kong-throw':kg.pose==='pound'||e.state==='cleared'?'kong-pound':'kong-stand';
  if(e.screen===100&&e.state==='cleared'){const f=C.clearPause-e.timer;this.put(this.kong,'kong-stand',kg.x,kg.y+f*f*D(60),k.kong);this.kong.rotation=Math.PI;this.kong.anchor.set(.5,.5)}else this.put(this.kong,pose,kg.x,kg.y,k.kong,kg.x>e.player.x&&e.screen!==25);
  const hz=e.hazards,hp=this.pool(this.hazardLayer,this.hazardSprites??=[],hz.length,'barrel');
  hz.forEach((h,i)=>{const s=hp[i];
   if(h.kind==='barrel'){const side=h.state==='roll'||h.state==='fall';this.put(s,h.blue&&side?'barrel-blue':side?'barrel':'barrel-up',h.x,h.y,k.barrel*(side?1:1.05),h.vx<0);if(side)s.rotation=Math.sin(t*12+h.id)*.08}
   else if(h.kind==='fire')this.put(s,(Math.floor(t*6)+h.id)%2?'fire-a':'fire-b',h.x,h.y-Math.abs(Math.sin(t*9+h.id))*D(1.5),k.fire,h.dir<0);
   else if(h.kind==='pie')this.put(s,'pie',h.x,h.y,D(7)/T.pie.height);
   else{const sq=h.state==='bounce'?.8+.3*Math.abs(Math.sin(h.t*Math.PI/.55)):1;this.put(s,'spring',h.x,h.y,D(13)/T.spring.height);s.scale.y*=sq}
   if(h.stun>0)s.rotation=Math.sin(t*18+h.id)*.22});
  this.drawPepper(e,t);
  // The boy: walking, climbing, jumping, swinging the mallet, knocked flat.
  // Her fuller set of poses (the old two-step walk was too limited; Nano Banana dk-hero-* v1): a four-step
  // walk, standing still when idle, three climbing poses stepped by height on the ladder, up and down in a jump, and the mallet swinging.
  const p=e.player,step=Math.floor(p.y/D(4)),pt=p.state==='climb'?'hero-climb-'+[1,2,3,2][((step%4)+4)%4]:p.state==='air'?(p.vy<0?'hero-jump-up':'hero-jump-fall'):p.hammer>0?(Math.floor(t*7)%2?'hero-hammer-down':'hero-hammer-up'):p.moving?'hero-walk-'+(Math.floor(t*10)%4+1):'hero-idle';let heroPose=pt;
  // Every pose at the walking scale (she drew them all at one size), so he does not shrink on a ladder; climbing mirrors the frame rung by rung.
  if(e.state==='dead')heroPose='dead';
  this.put(this.player,heroPose,p.x,p.y,k.hero,heroPose.startsWith('hero-climb')?false:p.dir<0);
  const hitText=this.puffs.find(f=>f.text);this.pointsText.text=hitText?hitText.text:'';if(hitText)this.pointsText.position.set(hitText.x,hitText.y-(1-hitText.life)*30);
  this.scoreText.text=String(e.score).padStart(6,'0');this.livesText.text='lives '+Math.max(0,e.lives);this.levelText.text='level '+e.level;this.bonusText.text='bonus '+e.bonus;this.pepperText.text=e.sticker==='pepper'?'pepper '+e.pepper:'';
  const best=g.No2Scores.best(this.services.save,ID,this.seed)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')}
  else if(this.mode==='over'){msg='final grade.';sub=''}
  else if(e.state==='ready'){msg=e.screen+' m';sub='how high can you get?'}
  else if(e.state==='cleared'){msg=e.screen===100?'class dismissed.':'up the stairs.'}
  // Tracing paper over the field while a message holds play.
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;this.typeScale();this.fitMargins()}
 // Pepper shaker sticker: the cloud puffs out in front of her and fades; a stunned barrel or fireball wobbles under
 // three little stars turning round over it.
 drawPepper(e,t){const fx=this.fx.clear();if(e.sticker!=='pepper')return;const P=C.pepper,cl=e.state==='play'?e.cloud:null;
  if(cl){const a=1-cl.t/P.cloud;for(let i=0;i<9;i++){const u=((i*37)%9)/9,x=cl.x+cl.dir*(D(6)+(P.reach-D(6))*a*(.35+.65*u)),y=cl.y-D(8)+Math.sin(i*2.1)*D(5)*(.4+a);fx.circle(x,y,D(2.2)+D(2.5)*a*u).fill({color:0x8a8478,alpha:.55*(1-a)+.1})}}
  for(const h of e.hazards){if(!(h.stun>0))continue;const cy=h.y-D(h.kind==='fire'?16:13);for(let i=0;i<3;i++){const ang=t*5+i*Math.PI*2/3;fx.star(h.x+Math.cos(ang)*D(5),cy+Math.sin(ang)*D(1.6),5,D(1.9),D(.8)).fill({color:0xd9a520,alpha:.95}).stroke({width:1,color:INK,alpha:.8})}}}
 // On a narrow page the type rules' smallest sizes are wider than the side margins: keep each column's text whole on the page
 // (bug hunt: on a phone the score's first digit and the bonus's last were cut off at the canvas edges).
 fitMargins(){const pad=6,L=[this.scoreLabel,this.scoreText,this.bestText],R=[this.livesText,this.levelText,this.bonusText,this.pepperText],half=a=>Math.max(...a.map(t=>t.text?t.width/2:0));
  const lx=Math.max(KongCore.px(0)/2,half(L)+pad),rx=Math.min((KongCore.px(224)+W)/2,W-half(R)-pad);for(const t of L)t.x=lx;for(const t of R)t.x=rx}
// UI type rules: sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.scoreLabel,this.livesText,this.levelText,this.bestText,this.pointsText,this.pepperText])t.style.fontSize=px(22);for(const t of [this.sub,this.bonusText])t.style.fontSize=px(30);
  const lx=KongCore.px(0)/2,rx=(KongCore.px(224)+W)/2,l=px(22)*1.3;this.scoreLabel.position.set(lx,40);this.scoreText.position.set(lx,40+l);this.bestText.position.set(lx,40+l+px(52)*1.3);
  this.livesText.position.set(rx,40);this.levelText.position.set(rx,40+l);this.bonusText.position.set(rx,40+2*l);this.pepperText.position.set(rx,40+2*l+px(30)*1.3);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreLabel,this.scoreText,this.livesText,this.levelText,this.bestText,this.bonusText,this.pepperText,this.pointsText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class KongAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1981){if(this.api)return this.api;const frame=document.createElement('div');frame.id='dunce-kong-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new KongGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>KongTests.run(KongCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.held={};this.game.fireArmed=false;this.game.pepperArmed=false;this.game.tap=false;this.game.shake=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);removeEventListener('blur',game.onBlur);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2DunceKong={Adapter:KongAdapter,Game:KongGame,art};
})(globalThis);
