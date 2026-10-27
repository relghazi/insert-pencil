'use strict';
// Testpest play page: runs TestpestCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over her graph paper. Like the 1981 vector cabinet the tube is drawn as lines in code, in her blue
// ballpoint with a yellow colored-pencil wash on the Claw's lane and green pencil spikes; the Claw, the bugs and the
// bursts are her drawings (testpest-sprites): red beetle Flippers, the purple shield bug Tanker, the snail Spiker,
// the pom-pom Fuseball and the zigzag Pulsar.
(function(g){
const ID='testpest',Core=TestpestCore,C=Core.CONFIG,W=C.width,H=C.height,INK=0x22355a,PEN=0x2a44b0,WASH=0xf2d264,SPIKE=0x3d8f4a,ZAPC=0xc8343c,ZIG=0x1fa7a8;
const names=['claw-a','claw-b','flipper-a','flipper-b','tanker','spiker','fuseball','pulsar','boom','spark'];
const art={"claw-a":"@@asset:assets/tempest/claw-a.webp@@","claw-b":"@@asset:assets/tempest/claw-b.webp@@","flipper-a":"@@asset:assets/tempest/flipper-a.webp@@","flipper-b":"@@asset:assets/tempest/flipper-b.webp@@",tanker:"@@asset:assets/tempest/tanker.webp@@",spiker:"@@asset:assets/tempest/spiker.webp@@",fuseball:"@@asset:assets/tempest/fuseball.webp@@",pulsar:"@@asset:assets/tempest/pulsar.webp@@",boom:"@@asset:assets/tempest/boom.webp@@",spark:"@@asset:assets/tempest/spark.webp@@"};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],fire:[' '],zap:['Shift','z','Z']};
// The well on the page: rim in front, the far end small and a little higher, as if looking down into the tunnel.
const CX=512,CY=424,R=338,RY=.9,FAR=.2,FARY=-.12,K=1.4;
const depth=z=>(1-z)/(1+K*z);
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: the shot, hits, the Superzapper's roar, the warp's rising whine, spikes and the pulse buzz.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.beat=0}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('testpest',e))return;
  if(e.type==='shot')b.tone(1500,.03,.016,'square');
  else if(e.type==='kill')b.noise(.18,1200,.06);
  else if(e.type==='spike')b.tone(260,.03,.015,'triangle');
  else if(e.type==='split')b.tone(700,.08,.03,'sawtooth');
  else if(e.type==='enemyShot')b.tone(500,.04,.01,'sawtooth');
  else if(e.type==='zap')b.noise(.9,2400,.09);
  else if(e.type==='cleared')for(let i=0;i<14;i++)b.tone(300+i*90,.09,.02,'square',i*.15);
  else if(e.type==='death')b.noise(1.1,300,.1);
  else if(e.type==='extra')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09)}
 loop(engine,dt){if(!this.on()||engine.state!=='play')return;this.beat-=dt;if(this.beat<=0){this.beat=.5;if(engine.enemies.some(e=>engine.pulsing(e)))this.bus.gameTone('testpest','pulsar-voice',90,.25,.02,'sawtooth')}}
}

class TestpestGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.sounds=new Sounds(services);this.puffs=[];this.flash=0}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const k of names)this.tex[k]=await texture(P,art[k]);
  const layer=()=>{const c=new P.Container();app.stage.addChild(c);return c};
  this.wash=new P.Graphics();app.stage.addChild(this.wash);this.lines=new P.Graphics();app.stage.addChild(this.lines);
  this.bugLayer=layer();this.shotLines=new P.Graphics();app.stage.addChild(this.shotLines);
  this.claw=new P.Sprite(this.tex['claw-a']);this.claw.anchor.set(.5,.6);app.stage.addChild(this.claw);this.fxLayer=layer();
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
 // Controller: stick (analog, with a dead zone) or D-pad moves the Claw round the rim; A fires; X is the Superzapper; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0,dz=v=>Math.abs(v)<.2?0:Math.sign(v)*Math.min(1,(Math.abs(v)-.2)/.7);
   now.axis=dz(x);now.left=b(14);now.right=b(15);now.up=b(12)||y<-.5;now.down=b(13)||y>.5;now.fire=b(0);now.zap=b(2);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.fire&&!this.pad.fire)this.edge(' ')}
  this.pad=now}
 // A tap shorter than a frame still counts once (latched on keydown).
 // Fire counts only once it has been let go since play resumed, so the A that starts the page does not shoot.
 // Touch: drag left or right to move round the rim, firing while a finger is down; a two-finger tap is the superzapper.
 input(){const pad=this.pad,h=this.held,s=this.touch.stick(),fire=!!(h.fire||pad.fire||this.tap||s.f);this.tap=false;if(!fire)this.fireArmed=true;
  const kx=(h.right||pad.right?1:0)-(h.left||pad.left?1:0);return{axis:kx||pad.axis||s.x,fire:fire&&this.fireArmed,zap:!!(h.zap||pad.zap||this.touch.take('twos'))}}
 newGame(seed=this.seed){this.seed=seed;this.engine=new Core.TempestEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,Core)||null;this.paused=false;this.puffs=[];if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);if(this.endHold>0)this.endHold-=dt;this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);if(this.engine.state==='end')this.endGame()}
  for(const f of this.puffs)f.life-=dt;this.puffs=this.puffs.filter(f=>f.life>0);this.flash=Math.max(0,this.flash-dt);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(ev.type==='kill'){const [x,y]=this.lanePoint(ev.lane,ev.z,ev.edge);this.puffs.push({x,y,life:.45,size:this.laneWidth(ev.lane,ev.z)*1.5,tex:'boom',text:ev.points?String(ev.points):''})}
   if(ev.type==='spike'){const [x,y]=this.lanePoint(ev.lane,ev.z);this.puffs.push({x,y,life:.2,size:26,tex:'spark'})}
   if(ev.type==='zap')this.flash=.4;
   if(ev.type==='death'){const [x,y]=this.lanePoint(ev.lane,ev.z);this.puffs.push({x,y,life:1.2,size:130,tex:'boom'})}
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}this.endHold=.9;const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 pool(layer,list,n,t){while(list.length<n){const s=new this.P.Sprite(this.tex[t]);s.anchor.set(.5);layer.addChild(s);list.push(s)}list.forEach((s,i)=>s.visible=i<n);return list}
 // Geometry: rim point i at depth z (0 rim, 1 far end) on the page.
 // A low, wide well (the flat one) is seen more from above: its rim drops and its far end rises, so the lanes open up like the cabinet's.
 view(sh){this.views??=new Map();let v=this.views.get(sh);if(!v){const ys=sh.rim.map(p=>p[1]),lift=Math.max(0,1-(Math.max(...ys)-Math.min(...ys))/2);v={rim:lift*.3,far:FARY-lift*.6};this.views.set(sh,v)}return v}
 // In the warp the view rides down with the Claw, as on the cabinet: the Claw stays at the front, the far end and its spikes rush up.
 point(i,z){z=Math.max(0,z-(this.cam||0));const sh=this.engine.shape,rim=sh.rim,v=this.view(sh),p=rim[((i%rim.length)+rim.length)%rim.length],s=depth(z),py=p[1]+v.rim,fx=p[0]*FAR,fy=p[1]*FAR+v.far;return [CX+(fx+(p[0]-fx)*s)*R,CY+(fy+(py-fy)*s)*R*RY]}
 // The middle of lane l (fractional lanes slide between neighbours); edge=true puts it on rim point l instead.
 lanePoint(l,z,edge=false){if(edge){const a=this.point(Math.floor(l),z),b=this.point(Math.floor(l)+1,z),t=l-Math.floor(l);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}
  const i=Math.floor(l),t=l-i,m=k=>{const a=this.point(k,z),b=this.point(k+1,z);return [(a[0]+b[0])/2,(a[1]+b[1])/2]},a=m(i);if(!t)return a;const b=m(i+1);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}
 laneWidth(l,z){const i=Math.round(l),a=this.point(i,z),b=this.point(i+1,z);return Math.hypot(b[0]-a[0],b[1]-a[1])}
 // Sprites face up the tube: from the far end toward the rim.
 facing(l,z){const a=this.lanePoint(l,Math.min(1,z+.05)),b=this.lanePoint(l,Math.max(0,z-.05));return Math.atan2(b[1]-a[1],b[0]-a[0])+Math.PI/2}
 render(){const e=this.engine,T=this.tex,sh=e.shape,n=sh.rim.length,lanes=C.lanes,t=e.clock;
  this.cam=e.state==='warp'||e.state==='dead'&&e.diedWarping?e.claw.z:0;
  // The tube: her ballpoint lines; the Claw's lane washed in yellow pencil, a pulsing lane in turquoise; the Superzapper flashes red.
  const L=this.lines.clear(),Wsh=this.wash.clear(),col=this.flash>0&&Math.floor(this.flash*20)%2?ZAPC:PEN,quad=(i,z0,z1)=>[...this.point(i,z0),...this.point(i+1,z0),...this.point(i+1,z1),...this.point(i,z1)];
  if(e.state!=='dead')Wsh.poly(quad(e.lane,0,1)).fill({color:WASH,alpha:.38});
  for(const b of e.enemies)if(e.pulsing(b)&&b.flip===0)Wsh.poly(quad(b.lane,0,1)).fill({color:ZIG,alpha:.22});
  const rimEnd=sh.closed?n:n-1;
  for(const z of [0,1]){const pts=[];for(let i=0;i<=rimEnd;i++)pts.push(...this.point(i,z));L.poly(pts,false).stroke({width:z?1.6:3,color:col,alpha:.9})}
  for(let i=0;i<(sh.closed?n:n);i++){const [ax,ay]=this.point(i,0),[bx,by]=this.point(i,1);L.moveTo(ax,ay).lineTo(bx,by).stroke({width:1.6,color:col,alpha:.75})}
  // Spikes: green pencil lines from the far end up to their tips.
  e.spikes.forEach((z,l)=>{if(z>=1)return;const [ax,ay]=this.lanePoint(l,z),[bx,by]=this.lanePoint(l,1);L.moveTo(ax,ay).lineTo(bx,by).stroke({width:3.2,color:SPIKE,alpha:.95}).circle(ax,ay,3).fill(SPIKE)});
  // Pulsing lanes get a zigzag of current down the middle.
  for(const b of e.enemies)if(e.pulsing(b)&&b.flip===0){const pts=[];for(let k=0;k<=12;k++){const pa=this.point(b.lane,k/12),pb=this.point(b.lane+1,k/12),f=k%2?.32:.68;pts.push(pa[0]+(pb[0]-pa[0])*f,pa[1]+(pb[1]-pa[1])*f)}L.poly(pts,false).stroke({width:2.2,color:ZIG})}
  // Bugs: a Flipper mid-flip slides across and turns over; a Spiker going back down faces the far end.
  const bugs=e.enemies.map(b=>{let l,edge=false,k=b.kind==='flipper'?(b.flip>0||Math.floor(t*6+b.id)%2?'flipper-b':'flipper-a'):b.kind,rot=0,sz=1;
   if(b.kind==='fuseball'){edge=true;l=b.flip>0?b.edge+(b.to-b.edge)*b.flip:b.edge;if(sh.closed&&Math.abs(b.to-b.edge)>1)l=b.edge+(b.to>b.edge?-1:1)*b.flip;rot=Math.sin(t*5+b.id)*.4;sz=.95}
   else{l=b.flip>0?b.from+this.flipStep(b)*b.flip:b.lane;rot=b.flip>0?b.dir*Math.PI*b.flip:0;sz=b.kind==='tanker'?1.05:b.kind==='pulsar'?(e.pulsing(b)?1.05:.9):b.kind==='spiker'?.8:.85}
   const z=b.z,[x,y]=this.lanePoint(l,z,edge),w=Math.max(18,Math.min(this.laneWidth(Math.round(l),z)*1.05,84));
   return {k,x,y,w:w*sz,rot:rot+(edge?0:this.facing(Math.round(l),z))+(b.kind==='spiker'&&b.dir>0?Math.PI:0),z}}).sort((a,b)=>b.z-a.z);
  const bp=this.pool(this.bugLayer,this.bugSprites??=[],bugs.length,'tanker');
  bugs.forEach((b,i)=>{const s=bp[i];if(s.texture!==T[b.k])s.texture=T[b.k];s.scale.set(b.w/Math.max(s.texture.width,s.texture.height));s.rotation=b.rot;s.position.set(b.x,b.y)});
  // Shots: her ink dots flying down the lane; enemy shots are red pencil crosses.
  const S=this.shotLines.clear();for(const s of e.shots){const [x,y]=this.lanePoint(s.lane,s.z),r=Math.max(2,6*depth(s.z)+1.5);S.circle(x,y,r).fill(INK)}
  for(const s of e.enemyShots){const [x,y]=this.lanePoint(s.lane,s.z),r=Math.max(3,8*depth(s.z)+2);S.moveTo(x-r,y-r).lineTo(x+r,y+r).moveTo(x+r,y-r).lineTo(x-r,y+r).stroke({width:2.6,color:ZAPC})}
  // The Claw sits on the rim at its lane (sliding between lanes as it moves) and dives down the lane in the warp.
  const c=e.claw,cl=sh.closed?c.pos:Math.max(0,Math.min(lanes-1,c.pos)),[cx,cy]=this.lanePoint(((cl%lanes)+lanes)%lanes,c.z),cw=Math.max(48,Math.min(100,this.laneWidth(e.lane,c.z)*1.25));
  this.claw.texture=T[e.shots.length&&e.fireTimer>.04?'claw-b':'claw-a'];this.claw.scale.set(cw/this.claw.texture.width);this.claw.rotation=this.facing(e.lane,c.z)+Math.PI;this.claw.position.set(cx,cy);
  this.claw.visible=e.state!=='dead'&&e.state!=='end';
  const puffs=this.puffs.map((f,i)=>f);const fp=this.pool(this.fxLayer,this.puffSprites??=[],puffs.length,'boom');
  puffs.forEach((f,i)=>{const s=fp[i];if(s.texture!==T[f.tex])s.texture=T[f.tex];s.position.set(f.x,f.y);s.scale.set(f.size/s.texture.width);s.alpha=Math.min(1,f.life*4)});
  const hitText=this.puffs.find(f=>f.text);this.pointsText.text=hitText?hitText.text:'';if(hitText)this.pointsText.position.set(hitText.x,hitText.y-40);
  this.scoreText.text=String(e.score).padStart(4,'0');this.livesText.text='lives '+Math.max(0,e.lives)+'   level '+e.level+'   zapper '+(e.zaps===0?'ready':e.zaps===1?'weak':'used');
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='final grade.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  else if(e.state==='warp'&&e.warpClock<1.2){msg=e.spikes.some(z=>z<1)?'avoid the spikes.':'next chapter.'}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(this.mode==='initials'||this.mode==='over');this.message.text=msg;this.sub.text=sub;this.typeScale()}
 // A flip goes to the neighbouring lane; round a closed well's seam that is a step of one, not fifteen.
 flipStep(b){let d=b.lane-b.from;if(Math.abs(d)>1)d=-Math.sign(d);return d}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.livesText,this.bestText,this.pointsText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  // A paper-coloured edge keeps a message readable where it shows over play without the tracing sheet.
  for(const t of [this.message,this.sub])t.style.stroke={color:0xf7f0e2,width:Math.max(3,Math.round(t.style.fontSize*.16)),join:'round'};
  this.scoreText.position.set(24,4);this.livesText.position.set(W-24,14);this.bestText.position.set(W/2,14);
  this.message.position.set(W/2,CY-px(30)*.7);this.sub.position.set(W/2,CY+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.livesText,this.bestText,this.pointsText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class TestpestAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1981){if(this.api)return this.api;const frame=document.createElement('div');frame.id='testpest-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new TestpestGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>TestpestTests.run(TestpestCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.held={};this.game.fireArmed=false;this.game.tap=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);removeEventListener('blur',game.onBlur);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2Testpest={Adapter:TestpestAdapter,Game:TestpestGame,art};
})(globalThis);
