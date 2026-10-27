'use strict';
// Hall Patrol play page: runs HallPatrolCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over her college-ruled paper: two rows of lockers and classroom doors scrolling at their own speeds
// behind a tiled hallway floor, her six-wheeled buggy, the saucers, the purple bombers and the tri-orbs, stacked
// textbooks, basketballs, mousetraps, the toy tank and the hall pass signs at each checkpoint (hall-patrol-sprites).
(function(g){
const ID='hall-patrol',Core=HallPatrolCore,C=Core.CONFIG,W=C.width,H=C.height,GY=C.groundY,INK=0x22355a,FLOOR=0xdfe5ee,SEAM=0x9fb0c8;
const names=['buggy','wheel','burst','wreck','saucer','bomber','orb','bomb','rock-big','rock-small','ball','mine','tank','lockers','door','crater-small','crater-big','sign'];
const art={buggy:"@@asset:assets/moonpatrol/buggy.webp@@",wheel:"@@asset:assets/moonpatrol/wheel.webp@@",burst:"@@asset:assets/moonpatrol/burst.webp@@",wreck:"@@asset:assets/moonpatrol/wreck.webp@@",saucer:"@@asset:assets/moonpatrol/saucer.webp@@",bomber:"@@asset:assets/moonpatrol/bomber.webp@@",orb:"@@asset:assets/moonpatrol/orb.webp@@",bomb:"@@asset:assets/moonpatrol/bomb.webp@@","rock-big":"@@asset:assets/moonpatrol/rock-big.webp@@","rock-small":"@@asset:assets/moonpatrol/rock-small.webp@@",ball:"@@asset:assets/moonpatrol/ball.webp@@",mine:"@@asset:assets/moonpatrol/mine.webp@@",tank:"@@asset:assets/moonpatrol/tank.webp@@",lockers:"@@asset:assets/moonpatrol/lockers.webp@@",door:"@@asset:assets/moonpatrol/door.webp@@","crater-small":"@@asset:assets/moonpatrol/crater-small.webp@@","crater-big":"@@asset:assets/moonpatrol/crater-big.webp@@",sign:"@@asset:assets/moonpatrol/sign.webp@@"};
// Sprite families, one scale each (logical units per sprite pixel); the buggy's anchor sits on its rear wheel arch line.
const K={buggy:140/390,wheel:30/146,thing:.3,crater:.36,ufo:.3,sign:.45};
const TEX={craterSmall:'crater-small',craterBig:'crater-big',rockSmall:'rock-small',rockBig:'rock-big',ball:'ball',mine:'mine',tank:'tank'};
// Background rows: far lockers and a nearer row of lockers and classroom doors, each scrolling slower than the floor.
const ROWS=[{k:.52,f:.3,y:GY-14,alpha:.4,gap:4,run:['lockers','door','lockers','lockers']},{k:.78,f:.6,y:GY+2,alpha:.85,gap:150,run:['lockers','door','lockers','door']}];
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],jump:['ArrowUp','w','W'],fire:[' ']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: the buggy's rumble, both guns, the jump, falling bombs, blasts, checkpoints and the section tune.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.beat=0}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('hall-patrol',e))return;
  if(e.type==='shot')b.tone(1400,.04,.018,'square');
  else if(e.type==='up')b.tone(2000,.03,.012,'square');
  else if(e.type==='jump')b.tone(260,.12,.02,'triangle');
  else if(e.type==='land')b.noise(.05,500,.03);
  else if(e.type==='bomb')for(let i=0;i<5;i++)b.tone(1500-i*200,.06,.012,'sine',i*.06);
  else if(e.type==='kill'||e.type==='blast')b.noise(.14,1200,.05);
  else if(e.type==='tankfire')b.tone(160,.08,.025,'sawtooth');
  else if(e.type==='pass')b.tone(880,.05,.015,'triangle');
  else if(e.type==='formation')for(let i=0;i<4;i++)b.tone(900+i*250,.06,.03,'square',i*.06);
  else if(e.type==='checkpoint')for(let i=0;i<2;i++)b.tone(660+i*220,.08,.025,'square',i*.1);
  else if(e.type==='section'||e.type==='course')for(let i=0;i<8;i++)b.tone([523,659,784,1047][i%4],.09,.03,'square',i*.11);
  else if(e.type==='death')b.noise(.9,300,.09);
  else if(e.type==='extra')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09)}
 loop(engine,dt){if(!this.on()||engine.state!=='play')return;this.beat-=dt;if(this.beat<=0){this.beat=.12;this.bus.gameTone('hall-patrol','engine-voice',70+engine.v*.25,.1,.01,'triangle');if(engine.ufos.length)this.bus.gameTone('hall-patrol','saucer-voice',600+Math.sin(engine.clock*7)*150,.1,.008,'sine')}}
}

class HallPatrolGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.tap={};this.pad={};this.sounds=new Sounds(services);this.puffs=[];this.spin=0;this.report=null}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const k of names)this.tex[k]=await texture(P,art[k]);
  const layer=()=>{const c=new P.Container();app.stage.addChild(c);return c};
  this.rowLayers=ROWS.map(()=>layer());this.floor=new P.Graphics();app.stage.addChild(this.floor);
  this.craterLayer=layer();this.signLayer=layer();this.letterLayer=layer();this.thingLayer=layer();this.shotLayer=new P.Graphics();app.stage.addChild(this.shotLayer);
  const sprite=(t,ax=.5,ay=.5)=>{const s=new P.Sprite(this.tex[t]);s.anchor.set(ax,ay);app.stage.addChild(s);return s};
  this.wheels=C.wheels.map(()=>{const s=sprite('wheel');s.scale.set(K.wheel);return s});
  this.buggy=sprite('buggy',.448,.934);this.buggy.scale.set(K.buggy);this.wreck=sprite('wreck',.5,.8);this.wreck.scale.set(K.buggy);
  this.ufoLayer=layer();this.fxLayer=layer();
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'});
  this.hud=layer();const text=(size,ax=.5,ay=0)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,ay);this.hud.addChild(t);return t};
  this.scoreText=text(52,0);this.livesText=text(22,1);this.bestText=text(22);this.pointsText=text(22);this.message=text(52,.5,.5);this.sub=text(30,.5,.5);
  this.gauge=new P.Graphics();this.hud.addChildAt(this.gauge,0);
  this.onKey=e=>this.key(e,true);this.offKey=e=>this.key(e,false);addEventListener('keydown',this.onKey);addEventListener('keyup',this.offKey);this.touch=g.No2TouchPad?.(this,app.canvas,W,H)||{fingers:new Map(),stick:()=>({x:0,y:0,d:0}),dir4:()=>null,take:k=>k==='twos'?0:[]};
  this.tracing=await g.No2Tracing?.attach(P,app,this.hud,{quiet:[this.message,this.sub]});this.newGame(this.seed);app.ticker.add(t=>this.frame(t.deltaMS/1000));return this}
 inputEnabled(){return !g.No2||g.No2.gameInputEnabled?.()!==false}
 key(e,down){if(!this.inputEnabled())return;const k=e.key;
  // Initials: letters typed on the keyboard go straight in (owner 2026-10-25), so no letter moves or pauses here.
  if(this.mode==='initials'){if(down){e.preventDefault();if(!e.repeat||k.startsWith('Arrow'))this.edge(k)}return}
  if(down&&(k==='p'||k==='P')){this.pause();e.preventDefault();return}
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){this.held[name]=down;if(down&&!e.repeat)this.tap[name]=true;e.preventDefault()}
  if(down&&!e.repeat)this.edge(k)}
 edge(k){if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller: stick (analog, with a dead zone) or D-pad left and right set the speed; A jumps, X fires; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0,dz=v=>Math.abs(v)<.2?0:Math.sign(v)*Math.min(1,(Math.abs(v)-.2)/.7);
   now.axis=dz(x);now.left=b(14);now.right=b(15);now.up=b(12)||y<-.5;now.down=b(13)||y>.5;now.jump=b(0);now.fire=b(2);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.jump&&!this.pad.jump)this.edge(' ')}
  this.pad=now}
 // Jump and fire count only once let go since play resumed, so the A that starts the page does not jump.
 // A key tapped and let go between two frames still counts for one step.
 // Touch: drag left or right to slow down or speed up; a tap on the left half jumps, on the right half fires.
 input(){const pad=this.pad,h=this.held,s=this.touch.stick(),taps=this.touch.take('taps'),t={...this.tap};for(const p of taps)t[p.x<W/2?'jump':'fire']=true;const fire=!!(h.fire||pad.fire||t.fire&&this.fireArmed),jump=!!(h.jump||pad.jump||t.jump&&this.jumpArmed);this.tap={};if(!fire)this.fireArmed=true;if(!jump)this.jumpArmed=true;
  const kx=(h.right||pad.right?1:0)-(h.left||pad.left?1:0);return{axis:kx||pad.axis||s.x,jump:jump&&this.jumpArmed,fire:fire&&this.fireArmed}}
 newGame(seed=this.seed){this.seed=seed;this.endHold=0;this.tap={};this.engine=new Core.PatrolEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,Core)||null;this.paused=false;this.puffs=[];this.report=null;if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo'){this.paused=!this.paused;this.tap={}}}
 frame(dt){dt=Math.min(dt,.1);this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);if(this.engine.state==='play')this.spin+=this.engine.v*dt/15;if(this.engine.state==='end'&&(this.endHold+=dt)>=Math.min(1.6,C.deathPause))this.endGame()}
  for(const f of this.puffs)f.life-=dt;this.puffs=this.puffs.filter(f=>f.life>0);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(['kill','blast','formation','pass'].includes(ev.type))this.puffs.push({x:ev.x,y:ev.y,life:ev.type==='pass'?.6:.4,size:ev.type==='pass'?0:ev.type==='blast'?44:64,text:ev.points?String(ev.points):''});
   if(ev.type==='section'||ev.type==='course')this.report=ev.type==='course'?{...this.report,course:ev}:{section:ev};
   if(ev.type==='checkpoint'&&!['E','J','O','T','Z'].includes(ev.letter))this.report=null;
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 pool(layer,list,n,t){while(list.length<n){const s=new this.P.Sprite(this.tex[t]);s.anchor.set(.5);layer.addChild(s);list.push(s)}list.forEach((s,i)=>s.visible=i<n);return list}
 tile(s,t){if(s.texture!==this.tex[t])s.texture=this.tex[t]}
 render(){const e=this.engine,T=this.tex,d=e.d;
  // Background rows: each run of lockers and doors repeats, scrolled by its own share of the distance.
  ROWS.forEach((row,ri)=>{const items=[];let x=0;const widths=row.run.map(t=>T[t].width*row.k+row.gap),span=widths.reduce((a,b)=>a+b,0),off=-((d*row.f)%span);
   for(let rep=0;off+rep*span<W;rep++){x=off+rep*span;row.run.forEach((t,i)=>{items.push([t,x]);x+=widths[i]})}
   const sp=this.pool(this.rowLayers[ri],this.rowSprites?.[ri]??((this.rowSprites??=[])[ri]=[]),items.length,'lockers');
   items.forEach(([t,x],i)=>{const s=sp[i];this.tile(s,t);s.anchor.set(0,1);s.scale.set(row.k);s.alpha=row.alpha;s.position.set(x,row.y)})});
  // The hallway floor: pale tiles with seams that scroll with the buggy.
  const f=this.floor.clear();f.rect(0,GY,W,H-GY).fill({color:FLOOR,alpha:.92});f.moveTo(0,GY).lineTo(W,GY).stroke({color:INK,width:2.5});
  for(const y of [GY+44,GY+104])f.moveTo(0,y).lineTo(W,y).stroke({color:SEAM,width:1.2});
  for(let x=-((d)%96);x<W;x+=96)f.moveTo(x,GY).lineTo(x-30,H).stroke({color:SEAM,width:1.2});
  // Obstacles: craters sink into the floor, the rest stand on it.
  const vis=e.objects.filter(o=>o.x-d>-120&&o.x-d<W+120),craters=vis.filter(o=>e.crater(o.kind)),things=vis.filter(o=>!e.crater(o.kind));
  const cp=this.pool(this.craterLayer,this.craterSprites??=[],craters.length,'crater-small');craters.forEach((o,i)=>{const s=cp[i];this.tile(s,TEX[o.kind]);s.anchor.set(.5,.3);s.scale.set(K.crater);s.position.set(o.x-d,GY)});
  const tp=this.pool(this.thingLayer,this.thingSprites??=[],things.length,'ball');things.forEach((o,i)=>{const s=tp[i];this.tile(s,TEX[o.kind]);s.anchor.set(.5,o.kind==='mine'?.8:.94);s.scale.set(K.thing);s.position.set(o.x-d,GY+(o.kind==='mine'?4:2));s.rotation=o.kind==='ball'?-(o.x/18)%(2*Math.PI):0});
  // Hall pass signs at the checkpoints, with their letters.
  const signs=[];for(let i=Math.max(0,e.cp-1);i<=Math.min(25,e.cp+2);i++){const x=e.marker(i)-d;if(x>-80&&x<W+80)signs.push([i,x])}
  const sp=this.pool(this.signLayer,this.signSprites??=[],signs.length,'sign');const lt=this.signText??=[];
  while(lt.length<signs.length){const t=new this.P.Text({text:'',style:{fontFamily:'Schoolhand, sans-serif',fontSize:30,fill:INK}});t.anchor.set(.5);this.letterLayer.addChild(t);lt.push(t)}
  lt.forEach((t,i)=>t.visible=i<signs.length);signs.forEach(([i,x],j)=>{const s=sp[j];s.anchor.set(.5,1);s.scale.set(K.sign);s.position.set(x,GY+4);lt[j].text=LETTERS[i];lt[j].position.set(x,GY+4-s.height*.76)});
  // Shots: the short forward shot, the anti-air shots and the tanks' shells, in ink.
  const g2=this.shotLayer.clear();if(e.shot)g2.rect(e.shot.x-d-8,GY-e.shot.h-2,16,4).fill(INK);
  for(const u of e.upShots)g2.rect(u.sx-2,u.y-10,4,14).fill(INK);for(const sh of e.shells)g2.circle(sh.x-d,GY-sh.h,5).fill(0x7a4a3a);
  // UFOs and their bombs.
  const fl=[...e.ufos.map(u=>[u.type,u.sx,u.y,0]),...e.bombs.map(b=>['bomb',b.x-d,b.y,1])],up=this.pool(this.ufoLayer,this.ufoSprites??=[],fl.length,'saucer');
  fl.forEach(([t,x,y,bomb],i)=>{const s=up[i];this.tile(s,t);s.scale.set(K.ufo);s.position.set(x,y+(bomb?0:Math.sin(e.clock*4+x*.01)*3));s.rotation=t==='orb'?e.clock*2:0});
  // The buggy: six wheels (three seen) bouncing on their springs under the body, or the wreck after a hit.
  const alive=e.state!=='dead'&&e.state!=='end',axle=GY-e.h-14,bob=e.h===0&&e.state==='play'?Math.sin(e.clock*22)*1.2:0;
  this.buggy.visible=alive;this.buggy.position.set(e.bsx,axle-4+bob);this.buggy.rotation=e.h>0?-Math.max(-.08,Math.min(.08,e.vh/6000)):0;
  this.wheels.forEach((w,i)=>{w.visible=alive;w.rotation=this.spin;w.position.set(e.bsx+C.wheels[i],axle+(e.h===0?Math.sin(e.clock*31+i*2)*1.5:0))});
  this.wreck.visible=!alive;this.wreck.position.set(e.bsx,GY+4);
  const puffs=this.pool(this.fxLayer,this.puffSprites??=[],this.puffs.length,'burst');this.puffs.forEach((p,i)=>{const s=puffs[i];s.position.set(p.x,p.y);s.scale.set(p.size/s.texture.width);s.alpha=Math.min(1,p.life*4);s.visible=p.size>0});
  const hitText=this.puffs.find(p=>p.text);this.pointsText.text=hitText?hitText.text:'';if(hitText)this.pointsText.position.set(hitText.x,hitText.y-50);
  this.scoreText.text=String(e.score).padStart(5,'0');this.livesText.text='buggies '+Math.max(0,e.lives)+'   '+(e.champion()?'champion':'beginner')+' course   point '+e.letter()+'   time '+Math.floor(e.secTime);
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode!=='demo'&&!this.ai?e.score:0):'';
  // The cabinet's progress bar: A to Z, with the sections marked and the buggy's place on it.
  const gx=W/2-180,gw=360,gy=58,gg=this.gauge.clear();gg.moveTo(gx,gy).lineTo(gx+gw,gy).stroke({color:INK,width:2});
  for(const i of [0,...C.sectionEnds])gg.moveTo(gx+gw*i/25,gy-6).lineTo(gx+gw*i/25,gy+6).stroke({color:INK,width:2});
  const prog=Math.max(0,Math.min(25,(e.bx()-e.marker(0))/C.segment));gg.circle(gx+gw*prog/25,gy,5).fill(0xc7574f);
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='final grade.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  else if(e.state==='section'&&this.report){const r=this.report.section,c=this.report.course;msg=c?(c.course===1?'beginner course passed.':'champion course passed.'):'point '+r.letter+' checked.';
   sub='your time '+r.time+'   average '+r.par+'   bonus '+(r.bonus+(c?c.bonus:0)).toLocaleString('en-US')}
  else if(e.state==='dead'&&e.lives>0)msg='tardy slip.';
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.livesText,this.bestText,this.pointsText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);for(const t of this.signText||[])t.style.fontSize=px(30);
  this.scoreText.position.set(24,4);this.livesText.position.set(W-24,14);this.bestText.position.set(W/2,14);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.livesText,this.bestText,this.pointsText,this.message,this.sub,...(this.signText||[])].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class HallPatrolAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1982){if(this.api)return this.api;const frame=document.createElement('div');frame.id='hall-patrol-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new HallPatrolGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>HallPatrolTests.run(HallPatrolCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.tap={};this.game.fireArmed=false;this.game.jumpArmed=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2HallPatrol={Adapter:HallPatrolAdapter,Game:HallPatrolGame,art};
})(globalThis);
