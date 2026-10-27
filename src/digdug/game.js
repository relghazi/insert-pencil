'use strict';
// Dig Doug play page: runs DigDougCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over her college-ruled paper: the football field's grass on top, four colored-pencil dirt strata below,
// Doug with his trowel and bike pump, goggled backpack moles for Pookas, the green mascot dragon for Fygars, lunchbox
// rocks, lunch vegetables and round flowers (dig-doug-sprites, dig-doug-dirt). Tunnels and the hose are drawn in code.
(function(g){
const ID='dig-doug',Core=DigDougCore,C=Core.CONFIG,W=C.width,H=C.height,INK=0x22355a,HOSE=0x3d6fc4,TUNNEL=0x6e4a2e,CELL=C.cell,S=C.sub;
const names=['doug-a','doug-b','doug-pump','doug-flat','doug-dizzy','mole-a','mole-b','mole-puff','mole-flat','mole-ghost','dragon-a','dragon-b','dragon-puff','dragon-flat','dragon-ghost','fire','lunchbox','lunchbox-broken','flower','flower-big','pop','nozzle','carrot','turnip','mushroom','cucumber','eggplant','pepper','tomato','onion','watermelon','bug','pineapple','grass','dirt-1','dirt-2','dirt-3','dirt-4'];
const art={"doug-a":"@@asset:assets/digdug/doug-a.webp@@","doug-b":"@@asset:assets/digdug/doug-b.webp@@","doug-pump":"@@asset:assets/digdug/doug-pump.webp@@","doug-flat":"@@asset:assets/digdug/doug-flat.webp@@","doug-dizzy":"@@asset:assets/digdug/doug-dizzy.webp@@","mole-a":"@@asset:assets/digdug/mole-a.webp@@","mole-b":"@@asset:assets/digdug/mole-b.webp@@","mole-puff":"@@asset:assets/digdug/mole-puff.webp@@","mole-flat":"@@asset:assets/digdug/mole-flat.webp@@","mole-ghost":"@@asset:assets/digdug/mole-ghost.webp@@","dragon-a":"@@asset:assets/digdug/dragon-a.webp@@","dragon-b":"@@asset:assets/digdug/dragon-b.webp@@","dragon-puff":"@@asset:assets/digdug/dragon-puff.webp@@","dragon-flat":"@@asset:assets/digdug/dragon-flat.webp@@","dragon-ghost":"@@asset:assets/digdug/dragon-ghost.webp@@",fire:"@@asset:assets/digdug/fire.webp@@",lunchbox:"@@asset:assets/digdug/lunchbox.webp@@","lunchbox-broken":"@@asset:assets/digdug/lunchbox-broken.webp@@",flower:"@@asset:assets/digdug/flower.webp@@","flower-big":"@@asset:assets/digdug/flower-big.webp@@",pop:"@@asset:assets/digdug/pop.webp@@",nozzle:"@@asset:assets/digdug/nozzle.webp@@",carrot:"@@asset:assets/digdug/carrot.webp@@",turnip:"@@asset:assets/digdug/turnip.webp@@",mushroom:"@@asset:assets/digdug/mushroom.webp@@",cucumber:"@@asset:assets/digdug/cucumber.webp@@",eggplant:"@@asset:assets/digdug/eggplant.webp@@",pepper:"@@asset:assets/digdug/pepper.webp@@",tomato:"@@asset:assets/digdug/tomato.webp@@",onion:"@@asset:assets/digdug/onion.webp@@",watermelon:"@@asset:assets/digdug/watermelon.webp@@",bug:"@@asset:assets/digdug/bug.webp@@",pineapple:"@@asset:assets/digdug/pineapple.webp@@",grass:"@@asset:assets/digdug/grass.webp@@","dirt-1":"@@asset:assets/digdug/dirt-1.webp@@","dirt-2":"@@asset:assets/digdug/dirt-2.webp@@","dirt-3":"@@asset:assets/digdug/dirt-3.webp@@","dirt-4":"@@asset:assets/digdug/dirt-4.webp@@"};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ',ART={pooka:'mole',fygar:'dragon'};
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],up:['ArrowUp','w','W'],down:['ArrowDown','s','S'],fire:[' ']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: the walking tune that plays only while he moves, the pump, pops, rocks, fire and the bonus.
const TUNE=[523,587,659,523,659,698,784,0,784,698,659,587,523,587,659,0];
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.beat=0;this.note=0}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('dig-doug',e))return;
  if(e.type==='shot')b.tone(900,.06,.02,'square');
  else if(e.type==='pump')b.tone(300+e.stage*120,.08,.03,'square');
  else if(e.type==='pop')b.noise(.18,1800,.07);
  else if(e.type==='wobble')for(let i=0;i<4;i++)b.tone(140,.05,.02,'triangle',i*.12);
  else if(e.type==='rockFall')for(let i=0;i<5;i++)b.tone(500-i*70,.07,.02,'triangle',i*.07);
  else if(e.type==='rockLand')b.noise(.3,400,.08);
  else if(e.type==='ghost')b.tone(1500,.08,.01,'sine');
  else if(e.type==='escape')for(let i=0;i<3;i++)b.tone(660-i*120,.06,.02,'triangle',i*.07);
  else if(e.type==='crush')for(let i=0;i<4;i++)b.tone(660+i*220,.07,.03,'square',i*.08);
  else if(e.type==='fire')b.noise(.5,900,.05);
  else if(e.type==='veggie')for(let i=0;i<3;i++)b.tone(1047+i*262,.06,.025,'triangle',i*.07);
  else if(e.type==='bonus')for(let i=0;i<6;i++)b.tone(784+i*131,.05,.03,'square',i*.06);
  else if(e.type==='flee')for(let i=0;i<4;i++)b.tone(880-i*110,.07,.02,'triangle',i*.08);
  else if(e.type==='death')for(let i=0;i<10;i++)b.tone(700-i*55,.09,.03,'square',i*.09);
  else if(e.type==='extra')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09);
  else if(e.type==='cleared')for(let i=0;i<8;i++)b.tone(TUNE[i]||523,.1,.03,'square',i*.11)}
 loop(engine,dt){if(!this.on()||engine.state!=='play'||!engine.player.moving)return;this.beat-=dt;if(this.beat<=0){this.beat=.14;const f=TUNE[this.note++%TUNE.length];if(f)this.bus.gameTone('dig-doug','walk-voice',f,.1,.018,'square')}}
}

class DigDougGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.sounds=new Sounds(services);this.puffs=[]}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const k of names)this.tex[k]=await texture(P,art[k]);
  // One scale per family: Doug, the moles and dragons and the vegetables each share one size.
  this.k={doug:CELL*1.15/this.tex['doug-a'].height,mole:CELL*1.0/this.tex['mole-a'].height,dragon:CELL*1.0/this.tex['dragon-a'].height,item:CELL*.9/this.tex.carrot.height};
  const layer=()=>{const c=new P.Container();app.stage.addChild(c);return c};
  // The ground: grass along the surface row, then four strata of three rows each, overlapping so no paper shows between.
  const ground=layer(),fw=C.cols*CELL;
  for(let i=0;i<4;i++){const s=new P.Sprite(this.tex['dirt-'+(i+1)]);s.position.set(C.left,C.top+CELL*(1+3*i)-(i?4:0));s.width=fw;s.height=CELL*3+(i?8:0);ground.addChild(s)}
  const grass=new P.Sprite(this.tex.grass);grass.anchor.set(0,1);grass.position.set(C.left,C.top+CELL+4);grass.width=fw;grass.height=CELL*.62;ground.addChild(grass);
  const rim=new P.Graphics();for(let i=1;i<4;i++)rim.moveTo(C.left,C.top+CELL*(1+3*i)).lineTo(C.left+fw,C.top+CELL*(1+3*i));rim.stroke({width:1.5,color:INK,alpha:.55});
  ground.addChild(rim,new P.Graphics().rect(C.left,C.top+CELL,fw,CELL*12).stroke({width:2.5,color:INK}));
  this.tunnels=new P.Graphics();ground.addChild(this.tunnels);this.drawnDigs=-1;
  this.flowerLayer=layer();this.rockLayer=layer();this.itemLayer=layer();this.hose=new P.Graphics();app.stage.addChild(this.hose);
  this.enemyLayer=layer();this.fxLayer=layer();
  const sprite=(t,ax=.5,ay=.5)=>{const s=new P.Sprite(this.tex[t]);s.anchor.set(ax,ay);app.stage.addChild(s);return s};
  this.nozzle=sprite('nozzle');this.player=sprite('doug-a',.5,.55);
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
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){this.held[name]=down;if(down&&name==='fire')this.tap=true;if(down&&name!=='fire')this.last=name;e.preventDefault()}
  if(down&&!e.repeat)this.edge(k)}
 // For a moment after the game ends a button still being mashed neither types initials nor restarts.
 edge(k){if(this.endHold>0)return;if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller: stick (with a dead zone) or D-pad walks; A pumps; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0,dz=v=>Math.abs(v)<.2?0:Math.sign(v)*Math.min(1,(Math.abs(v)-.2)/.7);
   now.axis=dz(x);now.axisY=dz(y);now.left=b(14);now.right=b(15);now.up=b(12)||y<-.5;now.down=b(13)||y>.5;now.dup=b(12);now.ddown=b(13);now.fire=b(0);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.fire&&!this.pad.fire)this.edge(' ')}
  this.pad=now}
 // A tap shorter than a frame still counts once (latched on keydown).
 // Fire counts only once it has been let go since play resumed, so the A that starts the page does not pump.
 // With two arrow keys held, the one pressed last wins, so a turn can be held early.
 // Touch: drag to dig (the stronger direction wins, as on the 4-way stick); a tap pumps.
 input(){const pad=this.pad,h=this.held,ts=this.touch.stick(),s=Math.abs(ts.x)>Math.abs(ts.y)?{x:ts.x,y:0}:{x:0,y:ts.y},fire=!!(h.fire||pad.fire||this.tap||this.touch.take('taps').length);this.tap=false;if(!fire)this.fireArmed=true;
  let kx=(h.right||pad.right?1:0)-(h.left||pad.left?1:0),ky=(h.down||pad.ddown?1:0)-(h.up||pad.dup?1:0);
  if(kx&&ky){if(this.last==='left'||this.last==='right')ky=0;else kx=0}
  return{axis:kx||pad.axis||s.x,axisY:ky||pad.axisY||s.y,fire:fire&&this.fireArmed}}
 newGame(seed=this.seed){this.seed=seed;this.engine=new Core.DigDugEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,Core)||null;this.paused=false;this.puffs=[];this.drawnDigs=-1;if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);if(this.endHold>0)this.endHold-=dt;this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);if(this.engine.state==='end')this.endGame()}
  for(const f of this.puffs)f.life-=dt;this.puffs=this.puffs.filter(f=>f.life>0);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(ev.type==='pop'||ev.type==='crush'||ev.type==='bonus')this.puffs.push({x:ev.x,y:ev.y,life:ev.type==='bonus'?1:.6,size:ev.type==='bonus'?0:CELL*1.3,text:String(ev.points)});
   if(ev.type==='rockLand')this.puffs.push({x:ev.x,y:ev.y,life:.4,size:CELL*1.1,text:''});
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}this.endHold=.9;const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 pool(layer,list,n,t){while(list.length<n){const s=new this.P.Sprite(this.tex[t]);s.anchor.set(.5);layer.addChild(s);list.push(s)}list.forEach((s,i)=>s.visible=i<n);return list}
 // Tunnels: an ink rim, then the dark dug earth, a disc at every dug quarter tile from the first dirt row down.
 drawTunnels(){const e=this.engine;if(this.drawnDigs===e.digs&&this.drawnField===e.field)return;this.drawnDigs=e.digs;this.drawnField=e.field;const t=this.tunnels.clear(),pts=[];
  for(let fy=S;fy<Core.FH;fy++)for(let fx=0;fx<Core.FW;fx++)if(e.field[fy*Core.FW+fx]&&(fx%S===0||fy%S===0))pts.push([Core.px(fx/S),Core.py(fy/S)]);
  const r=CELL*.43;for(const [x,y] of pts)t.circle(x,y,r+2.5);t.fill(INK);for(const [x,y] of pts)t.circle(x,y,r);t.fill(TUNNEL)}
 render(){const e=this.engine,T=this.tex,step=Math.floor(e.clock*7)%2;this.drawTunnels();
  // Round flowers on the surface at the right: a big one for every ten rounds, a small one for each other round.
  const fl=[...Array(Math.floor(e.round/10)).fill('flower-big'),...Array(e.round%10).fill('flower')].slice(0,12),fp=this.pool(this.flowerLayer,this.flowerSprites??=[],fl.length,'flower');
  fl.forEach((k,i)=>{const s=fp[i];if(s.texture!==T[k])s.texture=T[k];s.anchor.set(.5,1);s.scale.set(CELL*(k==='flower'?.62:.95)/T[k].height);s.position.set(C.left+C.cols*CELL-CELL*.35-i*CELL*.42,C.top+CELL)});
  const rp=this.pool(this.rockLayer,this.rockSprites??=[],e.rocks.length,'lunchbox');
  e.rocks.forEach((k,i)=>{const s=rp[i],t=k.state==='break'?'lunchbox-broken':'lunchbox';if(s.texture!==T[t])s.texture=T[t];s.scale.set(CELL*.95/T.lunchbox.height);s.rotation=k.state==='wobble'?Math.sin(e.clock*40)*.12:0;s.position.set(Core.px(k.c),Core.py(k.y))});
  const items=e.veggie&&(e.veggie.t>2||step)?[e.veggie]:[],ip=this.pool(this.itemLayer,this.itemSprites??=[],items.length,'carrot');
  items.forEach((v,i)=>{const s=ip[i];if(s.texture!==T[v.kind])s.texture=T[v.kind];s.scale.set(this.k.item);s.position.set(Core.px(v.x),Core.py(v.y))});
  // Enemies: walking on two steps, eyes only as ghosts, blown up stage by stage when pumped, flat under a rock, a burst when popped.
  const ep=this.pool(this.enemyLayer,this.enemySprites??=[],e.enemies.length*2,'mole-a');let n=0;
  for(const x of e.enemies){const s=ep[n++],a=ART[x.kind],kk=this.k[a];let t,sc=kk,face=x.dir.dx<0?-1:1;s.alpha=1;s.tint=0xffffff;s.rotation=0;
   if(x.popped){t='pop';sc=CELL*1.4/T.pop.height;face=1}else if(x.flat||x.crushed){t=a+'-flat';sc=kk*.9}else if(x.pump){t=a+'-puff';sc=CELL*(.85+.22*x.pump)/T[t].height}else if(x.ghost){t=a+'-ghost';sc=CELL*1.25/T[t].height}else t=a+(step&&!x.fire?'-b':'-a');
   if(x.fire?.phase==='charge'&&Math.floor(e.clock*12)%2)s.tint=0xff9a8a;
   if(s.texture!==T[t])s.texture=T[t];s.scale.set(sc*face,sc);s.position.set(Core.px(x.x),Core.py(x.y));
   const f=e.fireZone(x),o=ep[n++];o.visible=!!f;if(f){if(o.texture!==T.fire)o.texture=T.fire;o.anchor.set(0,.5);const w=Math.abs(f.x1-f.x0)*CELL;o.scale.set(w/T.fire.width*x.fire.dx,CELL*.8/T.fire.height);o.position.set(Core.px(f.x0),Core.py(f.y))}else o.anchor.set(.5)}
  // Hose: a blue line from the pump to the nozzle at its tip.
  const p=e.player,h=e.hose;this.hose.clear();this.nozzle.visible=!!h;
  if(h){const x0=Core.px(p.x),y0=Core.py(p.y),x1=Core.px(p.x+h.dx*h.len),y1=Core.py(p.y+h.dy*h.len);this.hose.moveTo(x0,y0).lineTo(x1,y1).stroke({width:5,color:HOSE});
   this.nozzle.position.set(x1,y1);this.nozzle.rotation=Math.atan2(h.dy,h.dx);this.nozzle.scale.set(CELL*.5/T.nozzle.width)}
  // Doug keeps upright and faces the way he last walked sideways; he pumps when the hose is out.
  const dead=e.state==='dead'||e.state==='end',pt=dead?(p.crushed?'doug-flat':'doug-dizzy'):p.crushed?'doug-flat':h?'doug-pump':p.moving&&step?'doug-b':'doug-a';
  if(this.player.texture!==T[pt])this.player.texture=T[pt];if(p.dir.dx)this.face=p.dir.dx;const dk=pt==='doug-flat'?CELL*1.5/T[pt].width:this.k.doug;
  this.player.scale.set(dk*(this.face||1),dk);this.player.position.set(Core.px(p.x),Core.py(p.y)+(pt==='doug-flat'?CELL*.25:0));this.player.visible=e.state!=='cleared'||Math.floor(e.clock*6)%2===0;
  const puffs=this.pool(this.fxLayer,this.puffSprites??=[],this.puffs.length,'pop');this.puffs.forEach((f,i)=>{const s=puffs[i];s.visible=f.size>0;s.position.set(f.x,f.y);if(f.size)s.scale.set(f.size/s.texture.width);s.alpha=Math.min(1,f.life*4)});
  const hitText=this.puffs.find(f=>f.text);this.pointsText.text=hitText?hitText.text:'';if(hitText)this.pointsText.position.set(hitText.x,hitText.y-CELL*.9);
  this.scoreText.text=String(e.score).padStart(4,'0');this.livesText.text='lives '+Math.max(0,e.lives)+'   round '+e.round;
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='final grade.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  else if(e.state==='cleared'){msg='next period.'}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.livesText,this.bestText,this.pointsText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  this.scoreText.position.set(C.left,4);this.livesText.position.set(C.left+C.cols*CELL,14);this.bestText.position.set(W/2,14);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.livesText,this.bestText,this.pointsText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class DigDougAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1982){if(this.api)return this.api;const frame=document.createElement('div');frame.id='digdoug-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new DigDougGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>DigDougTests.run(DigDougCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.held={};this.game.fireArmed=false;this.game.tap=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);removeEventListener('blur',game.onBlur);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2DigDoug={Adapter:DigDougAdapter,Game:DigDougGame,art};
})(globalThis);
