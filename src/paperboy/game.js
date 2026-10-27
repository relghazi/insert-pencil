'use strict';
// Term Paperboy play page: runs PaperboyCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over her college-ruled paper: the street drawn diagonally in colored pencil, her houses (bright for the
// subscribers, drab for the rest), the boy on his blue bike throwing rolled term papers, and the hazards of her
// neighbourhood (term-paperboy-sprites, term-paperboy-street).
(function(g){
const ID='term-paperboy',C=PaperboyCore.CONFIG,W=C.width,H=C.height,INK=0x22355a;
const names=['ride-a','ride-b','throw','crash','paper','bundle','mailbox','dog-a','dog-b','burst','car','tyre','dancer-a','dancer-b','tornado','reaper','mower-a','mower-b','sleep-a','sleep-b','glass','house-a','house-b','drab-a','drab-b','ramp','wall','target','tree','hedge','crack'];
const art={"ride-a":"@@asset:assets/paperboy/ride-a.webp@@","ride-b":"@@asset:assets/paperboy/ride-b.webp@@",throw:"@@asset:assets/paperboy/throw.webp@@",crash:"@@asset:assets/paperboy/crash.webp@@",paper:"@@asset:assets/paperboy/paper.webp@@",bundle:"@@asset:assets/paperboy/bundle.webp@@",mailbox:"@@asset:assets/paperboy/mailbox.webp@@","dog-a":"@@asset:assets/paperboy/dog-a.webp@@","dog-b":"@@asset:assets/paperboy/dog-b.webp@@",burst:"@@asset:assets/paperboy/burst.webp@@",car:"@@asset:assets/paperboy/car.webp@@",tyre:"@@asset:assets/paperboy/tyre.webp@@","dancer-a":"@@asset:assets/paperboy/dancer-a.webp@@","dancer-b":"@@asset:assets/paperboy/dancer-b.webp@@",tornado:"@@asset:assets/paperboy/tornado.webp@@",reaper:"@@asset:assets/paperboy/reaper.webp@@","mower-a":"@@asset:assets/paperboy/mower-a.webp@@","mower-b":"@@asset:assets/paperboy/mower-b.webp@@","sleep-a":"@@asset:assets/paperboy/sleep-a.webp@@","sleep-b":"@@asset:assets/paperboy/sleep-b.webp@@",glass:"@@asset:assets/paperboy/glass.webp@@","house-a":"@@asset:assets/paperboy/house-a.webp@@","house-b":"@@asset:assets/paperboy/house-b.webp@@","drab-a":"@@asset:assets/paperboy/drab-a.webp@@","drab-b":"@@asset:assets/paperboy/drab-b.webp@@",ramp:"@@asset:assets/paperboy/ramp.webp@@",wall:"@@asset:assets/paperboy/wall.webp@@",target:"@@asset:assets/paperboy/target.webp@@",tree:"@@asset:assets/paperboy/tree.webp@@",hedge:"@@asset:assets/paperboy/hedge.webp@@",crack:"@@asset:assets/paperboy/crack.webp@@"};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],up:['ArrowUp','w','W'],down:['ArrowDown','s','S'],fire:[' ']};
// The street on the page: forward (u) runs up to the right, across (v) runs down to the right, a 2:1 diagonal like her drawing.
const DX=.894,DY=.447,AX=400,AY=520,SKEW=-Math.atan2(DY,DX);
// Where her houses put the door (fraction of the sprite) and the base of the front wall: the isometric houses (owner 2026-10-28) share one frame, their front wall along the street, so no skew.
const HOUSE={a:{door:.7295,base:.7041},b:{door:.7295,base:.7041}},HOUSE_K=.4288,WINDOW_H=67;
// The isometric drawings' walls slope at 0.62 (about 30 degrees); the street is 2:1 (0.5): drawn 0.81 as tall, their edges lie exactly along the road (owner 2026-10-28).
const ISO_Y=.5/.62;
// Each hazard's sprite frames and size on the page (px tall), and which way the drawing faces.
const LOOK={car:[['car'],120,-1],tyre:[['tyre'],46,-1],dog:[['dog-a','dog-b'],52,-1],worker:[['mower-a'],92,-1],dancer:[['dancer-a','dancer-b'],84,0],drunk:[['sleep-a','sleep-b'],88,1],tornado:[['tornado'],120,0],reaper:[['reaper'],94,-1]};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// Sounds: the bike's tick, the throw, deliveries, breaking glass, crashes, bundles and the end of the day.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.beat=0;this.flip=false}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('term-paperboy',e))return;
  if(e.type==='throw')b.noise(.08,2200,.03);
  else if(e.type==='deliver')(e.how==='mailbox'?[880,1320]:[660]).forEach((f,i)=>b.tone(f,.08,.035,'square',i*.08));
  else if(e.type==='glass'||e.type==='window')b.noise(.25,4200,.06);
  else if(e.type==='knock'||e.type==='target')b.tone(520,.08,.035,'triangle');
  else if(e.type==='jump')for(let i=0;i<3;i++)b.tone(700+i*200,.06,.03,'square',i*.06);
  else if(e.type==='crash')b.noise(.8,300,.09);
  else if(e.type==='bundle')for(let i=0;i<3;i++)b.tone(990,.04,.03,'square',i*.06);
  else if(e.type==='empty')b.tone(160,.06,.02,'square');
  else if(e.type==='report'||e.type==='day')for(let i=0;i<4;i++)b.tone(523+i*131,.09,.03,'triangle',i*.1);
  else if(e.type==='extra')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09)}
 loop(engine,dt){if(!this.on()||engine.state!=='play')return;this.beat-=dt;if(this.beat<=0){this.beat=26/engine.rider.speed;this.flip=!this.flip;this.bus.gameTone('term-paperboy','pedal-voice',this.flip?220:200,.03,.008,'triangle')}}
}

class TermPaperboyGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.tap={};this.pad={};this.sounds=new Sounds(services);this.puffs=[];this.banner=null}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const k of names)this.tex[k]=await texture(P,art[k]);
  this.ground=new P.Graphics();app.stage.addChild(this.ground);
  this.world=new P.Container();this.world.sortableChildren=true;app.stage.addChild(this.world);
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'});
  this.hud=new P.Container();app.stage.addChild(this.hud);this.panel=new P.Graphics();this.hud.addChild(this.panel);const text=(size,ax=.5,ay=0)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,ay);this.hud.addChild(t);return t};
  this.scoreText=text(52,0);this.livesText=text(22,1);this.bestText=text(22);this.pointsText=text(22);this.message=text(52,.5,.5);this.sub=text(30,.5,.5);
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
 // Controller: stick (analog, with a dead zone) or D-pad: up speeds up, down brakes, left and right steer; A throws; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0,dz=v=>Math.abs(v)<.2?0:Math.sign(v)*Math.min(1,(Math.abs(v)-.2)/.7);
   now.axis=dz(x);now.axisY=dz(y);now.left=b(14);now.right=b(15);now.up=b(12)||y<-.5;now.down=b(13)||y>.5;now.dup=b(12);now.ddown=b(13);now.fire=b(0);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.fire&&!this.pad.fire)this.edge(' ')}
  this.pad=now}
 // Throw counts only once it has been let go since play resumed, so the A that starts the page does not throw.
 // A key tapped and let go between two frames still counts for one step.
 // Touch: drag to steer, push up to speed up and down to brake; a tap throws a paper.
 input(){const pad=this.pad,h=this.held,s=this.touch.stick(),fire=!!(h.fire||pad.fire||(this.tap.fire||this.touch.take('taps').length)&&this.fireArmed);this.tap={};if(!fire)this.fireArmed=true;
  const kx=(h.right||pad.right?1:0)-(h.left||pad.left?1:0),ky=(h.down||pad.ddown?1:0)-(h.up||pad.dup?1:0);return{axis:kx||pad.axis||s.x,axisY:ky||pad.axisY||s.y,fire:fire&&this.fireArmed}}
 newGame(seed=this.seed){this.seed=seed;this.endHold=0;this.tap={};this.engine=new PaperboyCore.PaperboyEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,PaperboyCore)||null;this.paused=false;this.puffs=[];if(this.mode!=='demo')this.mode='play';this.initials=null;this.banner={text:'monday.',life:2.5}}
 pause(){if(this.mode==='play'||this.mode==='demo'){this.paused=!this.paused;this.tap={}}}
 frame(dt){dt=Math.min(dt,.1);this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);if(this.engine.state==='end'&&(this.endHold+=dt)>=Math.min(1.6,C.deathPause))this.endGame();
   for(const f of this.puffs)f.life-=dt;this.puffs=this.puffs.filter(f=>f.life>0);if(this.banner&&(this.banner.life-=dt)<=0)this.banner=null}
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(['deliver','window','knock','target','jump','finish'].includes(ev.type))this.puffs.push({u:ev.u,v:ev.v,h:ev.type==='window'?WINDOW_H:20,life:.8,text:String(ev.points),k:ev.type==='window'?'glass':null,size:60});
   if(ev.type==='glass'&&ev.sub)this.puffs.push({u:ev.u,v:ev.v,h:WINDOW_H,life:.6,k:'glass',size:60});
   if(ev.type==='crash')this.puffs.push({u:ev.u,v:ev.v,h:30,life:1,k:'burst',size:130});
   if(ev.type==='day')this.banner={text:C.days[ev.day]+'.',life:2.5};
   if(ev.type==='course')this.banner={text:'training course.',life:2.5};if(ev.type==='timeup')this.banner={text:'out of time.',life:2};
   if(ev.type==='report')this.banner={text:ev.perfect?'perfect day!':'end of '+C.days[ev.day]+'.',sub:'delivered '+ev.delivered+'   cancelled '+ev.cancelled+'   bonus '+ev.bonus,life:C.reportPause};
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 at(u,v,h=0){const d=u-this.cam;return[AX+(d+v)*DX,AY+(v-d)*DY-h]}
 // The ground: lawns, the walk to each door, the sidewalk with its joints, the kerb, the road with its centre line.
 drawGround(){const G=this.ground.clear(),e=this.engine,a=this.cam-900,b=this.cam+1100,course=e.phase==='course';
  const band=(u0,u1,v0,v1,color,alpha)=>{G.poly([...this.at(u0,v0),...this.at(u1,v0),...this.at(u1,v1),...this.at(u0,v1)]).fill({color,alpha})};
  const line=(u0,u1,v,alpha=.7,w=2)=>{G.moveTo(...this.at(u0,v)).lineTo(...this.at(u1,v)).stroke({color:INK,alpha,width:w})};
  band(a,b,-900,-130,course?0x9cc47e:0xa9cf8a,.45);band(a,b,195,900,0xa9cf8a,.45);
  if(!course)for(const h of e.houses){const s=h.mid-230;if(s>b||s+C.houseLen<a)continue;band(s,s+C.houseLen,C.wallV,-130,h.sub?0x86c46a:0x9fa68a,.5);band(h.mid-14,h.mid+14,C.wallV+10,-130,0xe8e2d0,.8)}
  band(a,b,-130,-80,course?0xd8c3a0:0xdcdad2,.8);band(a,b,150,195,0xdcdad2,.8);band(a,b,-80,150,course?0xc8a77c:0x9aa3b4,.5);
  for(let u=Math.ceil(a/60)*60;u<b;u+=60){G.moveTo(...this.at(u,-130)).lineTo(...this.at(u,-80)).moveTo(...this.at(u,150)).lineTo(...this.at(u,195)).stroke({color:INK,alpha:.3,width:1.5})}
  if(!course)for(let u=Math.ceil(a/90)*90;u<b;u+=90)G.moveTo(...this.at(u,35)).lineTo(...this.at(u+45,35)).stroke({color:0xffffff,alpha:.85,width:4});
  line(a,b,-130,.5);line(a,b,-80);line(a,b,150);line(a,b,195,.5);
  if(course){const f=C.course.length;G.moveTo(...this.at(f,-80)).lineTo(...this.at(f,150)).stroke({color:INK,alpha:.8,width:5})}}
 sprite(list,i,k){let s=list[i];if(!s){s=new this.P.Sprite(this.tex[k]);this.world.addChild(s);list[i]=s}s.texture=this.tex[k];s.visible=true;s.skew.set(0,0);s.rotation=0;s.alpha=1;s.tint=0xffffff;return s}
 put(s,u,v,h,height,ax=.5,ay=.92,flip=false){const [x,y]=this.at(u,v,h),k=height/s.texture.height;s.anchor.set(ax,ay);s.scale.set(flip?-k:k,k);s.position.set(x,y);s.zIndex=this.at(u,v)[1];return s}
 render(){const e=this.engine,T=this.tex,R=e.rider,step=Math.floor(e.clock*6)%2;this.cam=R.u;this.drawGround();
  const pool=this.objs??=[];let n=0;const add=k=>this.sprite(pool,n++,k);const view=u=>u>this.cam-900&&u<this.cam+1100;
  if(e.phase==='route'){for(const h of e.houses){if(!view(h.mid))continue;const st=h.style?'b':'a',L=HOUSE[st],s=add((h.sub?'house-':'drab-')+st);
    s.anchor.set(L.door,L.base);s.scale.set(HOUSE_K,HOUSE_K*ISO_Y);s.position.set(...this.at(h.mid,C.wallV));s.zIndex=-5000-h.i;// houses further up the street stand behind the nearer ones
    h.broken.forEach((b,i)=>{if(!b)return;const c=add('crack');this.put(c,h.mid+C.windows[i],C.wallV,WINDOW_H,34,.5,.5);c.skew.set(0,SKEW);c.zIndex=-4000});
    const m=this.put(add('mailbox'),h.mid+C.mailboxAt,C.mailboxV,0,58,.75,.97);if(!h.sub)m.tint=0x9a9aa6;
    if(h.i%2===0)this.put(add('tree'),h.mid-235,-430,0,190,.5,.95).zIndex=-6000;else this.put(add('hedge'),h.mid-230,-200,0,46,.5,.9);
    if(h.i%3===1)this.put(add('tree'),h.mid,330,0,170,.5,.95)}
   for(const b of e.bundles)if(!b.taken&&view(b.u))this.put(add('bundle'),b.u,b.v,0,34);
   for(const z of e.hazards){if(!z.alive||!z.active||!view(z.u))continue;const [frames,size,face]=LOOK[z.type];let k=frames[step%frames.length],dx=(z.vu+z.vv)*DX,flip=face!==0&&dx!==0&&Math.sign(dx)!==face;
    if(z.type==='dog'&&k==='dog-b')flip=!flip;if(z.type==='worker'){k=z.vv>0?'mower-a':'mower-b';flip=true}if(z.type==='drunk')flip=false;
    const s=this.put(add(k),z.u,z.v,0,size,.5,.92,flip);if(z.type==='tyre')s.rotation=Math.sin(e.clock*12)*.15}}
  else{for(const t of e.targets)if(view(t.u)){const s=this.put(add('target'),t.u,t.v,0,90);if(t.hit){s.alpha=.45;s.rotation=-.5}}
   for(const r of e.ramps)if(view(r.u))this.put(add('ramp'),r.u,(r.lo+r.hi)/2,0,74,.5,.8).scale.y*=ISO_Y;
   for(const w of e.walls)if(view(w.u)){const s=this.put(add('wall'),w.u,(w.lo+w.hi)/2,0,40,.5,.75);s.scale.set(((w.hi-w.lo)*DX+24)/s.texture.width);s.scale.y*=ISO_Y}// the isometric wall runs across the path, as long as the span it blocks
   for(let u=200;u<C.course.length;u+=420)if(view(u))this.put(add('tree'),u,-380,0,180,.5,.95)}
  for(const p of e.landed)if(view(p.u)){const s=this.put(add('paper'),p.u,p.v,0,16);s.rotation=.4}
  for(const p of e.flying){const s=this.put(add('paper'),p.u,p.v,p.h,22,.5,.5);s.rotation=p.t*14}
  const dead=e.state==='dead',rk=dead?'crash':R.throwT>0?'throw':Math.floor(R.u/40)%2?'ride-a':'ride-b',rs=this.put(add(rk),R.u,R.v,R.h,dead?70:100,.5,.94);rs.zIndex+=.5;if(R.safe>0&&!dead)rs.alpha=Math.floor(e.clock*10)%2?.35:1;// blinks through the grace after a crash
  for(const f of this.puffs)if(f.k){const s=this.put(add(f.k),f.u,f.v,f.h,f.size,.5,.5);s.alpha=Math.min(1,f.life*3);s.zIndex=1e4}
  for(let i=n;i<pool.length;i++)pool[i].visible=false;
  const hitText=this.puffs.find(f=>f.text);this.pointsText.text=hitText?hitText.text:'';if(hitText)this.pointsText.position.set(...this.at(hitText.u,hitText.v,hitText.h+50+(.8-hitText.life)*40));
  this.scoreText.text=String(e.score).padStart(5,'0');this.livesText.text='lives '+Math.max(0,e.lives)+'   papers '+(e.phase==='course'?'plenty   time '+Math.ceil(e.courseTime||0):e.papers)+'   '+C.days[e.day];
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode!=='demo'&&!this.ai?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='final grade.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  else if(this.banner){msg=this.banner.text;sub=this.banner.sub||''}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(this.mode==='initials'||this.mode==='over'||e.state==='report');this.message.text=msg;this.sub.text=sub;this.typeScale();
  // The score line sits on a cream band with a thin ink border, so the street never runs through the numbers.
  const pn=this.panel.clear(),hb=[this.scoreText,this.livesText,this.bestText].filter(t=>t.text).map(t=>t.getBounds()),bottom=Math.max(...hb.map(b=>b.y+b.height))+6;
  pn.rect(0,0,W,bottom).fill({color:0xfbf3e2,alpha:.94});pn.moveTo(0,bottom).lineTo(W,bottom).stroke({color:INK,width:1.5});}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.livesText,this.bestText,this.pointsText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  // A paper-coloured edge keeps a message readable where it shows over play without the tracing sheet.
  for(const t of [this.message,this.sub])t.style.stroke={color:0xf7f0e2,width:Math.max(3,Math.round(t.style.fontSize*.16)),join:'round'};
  this.scoreText.position.set(24,4);this.livesText.position.set(W-24,14);this.bestText.position.set(W/2,14);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.livesText,this.bestText,this.pointsText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class TermPaperboyAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1981){if(this.api)return this.api;const frame=document.createElement('div');frame.id='term-paperboy-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new TermPaperboyGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>PaperboyTests.run(PaperboyCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.tap={};this.game.fireArmed=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2TermPaperboy={Adapter:TermPaperboyAdapter,Game:TermPaperboyGame,art};
})(globalThis);
