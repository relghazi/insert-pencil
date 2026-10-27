'use strict';
// Froggology play page: runs FroggologyCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over her biology lab paper: her backpack frog crossing a hallway of lab carts, running classmates,
// a skateboarder and the janitor's cart, then a river of lunch trays, pet turtles and a crocodile, up to five
// specimen jars with the fly, the jar crocodile and the pink lady frog (froggology-sprites). Lanes and water are
// ballpoint lines drawn in code.
(function(g){
const ID='froggology',Core=FroggologyCore,C=Core.CONFIG,W=C.width,H=C.height,INK=0x22355a,WATER=0x5b8fd0,CELL=C.cell,FW=C.cols*CELL,FH=C.rows*CELL;
const names=['frog','frog-leap','lady','splat','splash','jar','jar-frog','jar-croc-peek','jar-croc','fly','cart','boy','girl','skater','janitor','tray','turtle-a','turtle-b','turtle-dive','croc'];
const art={frog:"@@asset:assets/frogger/frog.webp@@","frog-leap":"@@asset:assets/frogger/frog-leap.webp@@",lady:"@@asset:assets/frogger/lady.webp@@",splat:"@@asset:assets/frogger/splat.webp@@",splash:"@@asset:assets/frogger/splash.webp@@",jar:"@@asset:assets/frogger/jar.webp@@","jar-frog":"@@asset:assets/frogger/jar-frog.webp@@","jar-croc-peek":"@@asset:assets/frogger/jar-croc-peek.webp@@","jar-croc":"@@asset:assets/frogger/jar-croc.webp@@",fly:"@@asset:assets/frogger/fly.webp@@",cart:"@@asset:assets/frogger/cart.webp@@",boy:"@@asset:assets/frogger/boy.webp@@",girl:"@@asset:assets/frogger/girl.webp@@",skater:"@@asset:assets/frogger/skater.webp@@",janitor:"@@asset:assets/frogger/janitor.webp@@",tray:"@@asset:assets/frogger/tray.webp@@","turtle-a":"@@asset:assets/frogger/turtle-a.webp@@","turtle-b":"@@asset:assets/frogger/turtle-b.webp@@","turtle-dive":"@@asset:assets/frogger/turtle-dive.webp@@",croc:"@@asset:assets/frogger/croc.webp@@"};
// Road lanes: the cabinet's cars, bulldozer, racer and truck become her classmates and the school's carts.
const TRAFFIC={cart:'cart',boy:'boy',girl:'girl',racer:'skater',truck:'janitor'};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ',DIRS=['up','down','left','right'];
const KEYS={up:['ArrowUp','w','W'],down:['ArrowDown','s','S'],left:['ArrowLeft','a','A'],right:['ArrowRight','d','D']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: the hop, the splash, the squash, a frog home, the fly, the lady frog and the time warning.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.beat=0}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('froggology',e))return;
  if(e.type==='hop')b.tone(520,.04,.02,'square');
  else if(e.type==='home'){for(let i=0;i<4;i++)b.tone(660+i*110,.07,.03,'square',i*.07);if(e.fly||e.lady)for(let i=0;i<3;i++)b.tone(1320,.05,.03,'square',.3+i*.07)}
  else if(e.type==='lady')for(let i=0;i<3;i++)b.tone(990+i*220,.05,.025,'sine',i*.05);
  else if(e.type==='death'){if(['water','edge','croc'].includes(e.cause))b.noise(.6,700,.08);else b.noise(.5,260,.1)}
  else if(e.type==='cleared')for(let i=0;i<8;i++)b.tone(523*[1,1.25,1.5,2][i%4],.1,.03,'square',i*.11);
  else if(e.type==='extra')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09)}
 loop(engine,dt){if(!this.on()||engine.state!=='play'||engine.time>5)return;this.beat-=dt;if(this.beat<=0){this.beat=.5;this.bus.gameTone('froggology','timer-voice',880,.06,.02,'square')}}
}

class FroggologyGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.tap=null;this.sounds=new Sounds(services);this.puffs=[]}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const k of names)this.tex[k]=await texture(P,art[k]);
  // One scale per family: frogs, jars, hallway traffic, turtles.
  this.k={frog:CELL*.92/this.tex.frog.height,jar:CELL*1.3/this.tex.jar.height,turtle:CELL*1.12/this.tex['turtle-a'].width};
  // Hallway traffic fits its own lane, line to line, so classmates in neighbouring lanes never overlap and each sprite spans its hit length.
  this.k.traffic={};for(const [t,h] of Object.entries({cart:.9,boy:1,girl:1,skater:.9,janitor:1}))this.k.traffic[t]=CELL*h/this.tex[t].height;
  app.stage.addChild(this.board());
  const layer=(mask)=>{const c=new P.Container();app.stage.addChild(c);if(mask){const m=new P.Graphics().rect(C.left,C.top,FW,FH).fill(0xffffff);app.stage.addChild(m);c.mask=m}return c};
  this.riverLayer=layer(true);this.jarLayer=layer();this.trafficLayer=layer(true);this.fxLayer=layer();
  const sprite=(t,parent=app.stage)=>{const s=new P.Sprite(this.tex[t]);s.anchor.set(.5);parent.addChild(s);return s};
  this.ladySprite=sprite('lady',this.riverLayer);this.player=sprite('frog');this.rider=sprite('lady');this.flySprite=sprite('fly');
  this.timeBar=new P.Graphics();app.stage.addChild(this.timeBar);
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'});
  this.hud=layer();const text=(size,ax=.5,ay=0)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,ay);this.hud.addChild(t);return t};
  this.scoreText=text(52,0);this.livesText=text(22,1);this.bestText=text(22);this.timeText=text(22,1,.5);this.pointsText=text(22);this.message=text(52,.5,.5);this.sub=text(30,.5,.5);
  this.onKey=e=>this.key(e,true);this.offKey=e=>this.key(e,false);addEventListener('keydown',this.onKey);addEventListener('keyup',this.offKey);this.touch=g.No2TouchPad?.(this,app.canvas,W,H)||{fingers:new Map(),stick:()=>({x:0,y:0,d:0}),dir4:()=>null,take:k=>k==='twos'?0:[]};this.onBlur=()=>{this.held={}};addEventListener('blur',this.onBlur);
  this.tracing=await g.No2Tracing?.attach(P,app,this.hud,{quiet:[this.message,this.sub]});this.newGame(this.seed);app.ticker.add(t=>this.frame(t.deltaMS/1000));return this}
 // The board in her ballpoint: a double frame, the jar shelf, wavy water lines over a pale blue wash, the median and dashed hallway lanes.
 board(){const P=this.P,b=new P.Graphics(),L=C.left,R=L+FW,y=r=>C.top+r*CELL,wob=(a,s)=>Math.sin(a*.045+s*1.7)*1.4;
  b.rect(L,y(1),FW,5*CELL).fill({color:0x9cc8e8,alpha:.32});
  for(let r=1;r<=5;r++)for(let k=0;k<2;k++){const yy=y(r)+CELL*(.3+k*.42);b.moveTo(L+4,yy);for(let x=L+4;x<=R-4;x+=8)b.lineTo(x,yy+Math.sin((x+k*37+r*61)*.09)*2.2);b.stroke({width:1.6,color:WATER,alpha:.55})}
  const line=(yy,s,w=2.4,dash=0)=>{if(!dash){b.moveTo(L,yy+wob(L,s));for(let x=L;x<=R;x+=24)b.lineTo(x,yy+wob(x,s));b.stroke({width:w,color:INK,alpha:.85})}else{for(let x=L+10;x<R-10;x+=dash*2)b.moveTo(x,yy+wob(x,s)).lineTo(Math.min(R-10,x+dash),yy+wob(x+dash,s));b.stroke({width:w,color:INK,alpha:.6})}};
  line(y(1),1,3);line(y(6),2);line(y(7),3);for(let r=8;r<=11;r++)line(y(r),r,2,18);line(y(12),4);
  b.rect(L-6,C.top-8,FW+12,FH+14).stroke({width:2.6,color:INK,alpha:.9}).rect(L-12,C.top-14,FW+24,FH+26).stroke({width:1.4,color:INK,alpha:.7});
  return b}
 inputEnabled(){return !g.No2||g.No2.gameInputEnabled?.()!==false}
 key(e,down){if(!this.inputEnabled()){if(!down)this.held={};return}const k=e.key;
  // Initials: letters typed on the keyboard go straight in (owner 2026-10-25), so no letter moves or pauses here.
  if(this.mode==='initials'){if(down){e.preventDefault();if(!e.repeat||k.startsWith('Arrow'))this.edge(k)}return}
  if(down&&(k==='p'||k==='P')){this.pause();e.preventDefault();return}
  // A tap shorter than a frame still hops: it is kept until the frog takes off.
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){this.held[name]=down;if(down&&!e.repeat)this.tap=name;e.preventDefault()}
  if(down&&!e.repeat)this.edge(k)}
 // For a moment after the game ends a button still being mashed neither types initials nor restarts.
 edge(k){if(this.endHold>0)return;if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller: stick (with a dead zone) or D-pad hops in four directions; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0,big=Math.abs(x)>Math.abs(y);
   now.up=b(12)||!big&&y<-.5;now.down=b(13)||!big&&y>.5;now.left=b(14)||big&&x<-.5;now.right=b(15)||big&&x>.5;now.fire=b(0);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.fire&&!this.pad.fire)this.edge(' ')}
  else for(const d of DIRS)if(now[d]&&!this.pad[d])this.tap=d;
  this.pad=now}
 // Touch: a tap hops forward, a swipe hops that way.
 input(){const T=this.touch;if(T.take('taps').length)this.tap='up';for(const s of T.take('swipes'))this.tap=T.dir4({x:s.dx,y:s.dy});const pad=this.pad,h=this.held,i={};for(const d of DIRS)i[d]=!!(h[d]||pad[d]);if(this.tap)i[this.tap]=true;return i}
 newGame(seed=this.seed){this.seed=seed;this.engine=new Core.FroggerEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,Core)||null;this.paused=false;this.puffs=[];this.tap=null;if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);if(this.endHold>0)this.endHold-=dt;this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   if(this.engine.state!=='play')this.tap=null;this.sounds.loop(this.engine,dt);if(this.engine.state==='end')this.endGame()}
  for(const f of this.puffs)f.life-=dt;this.puffs=this.puffs.filter(f=>f.life>0);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(ev.type==='hop')this.tap=null;
   if(ev.type==='home')this.puffs.push({x:ev.x,y:ev.y-CELL*.9,life:1,text:String(ev.points)});
   if(ev.type==='cleared')this.puffs.push({x:W/2,y:Core.rowY(6),life:1.8,text:'+'+ev.points});
   if(ev.type==='death')this.cause=ev.cause;
   if(ev.type==='death')this.puffs.push({x:ev.x,y:ev.y,life:C.deathPause,dead:['water','edge','croc'].includes(ev.cause)?'splash':'splat'});
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}this.endHold=.9;const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 pool(layer,list,n,t){while(list.length<n){const s=new this.P.Sprite(this.tex[t]);s.anchor.set(.5);layer.addChild(s);list.push(s)}list.forEach((s,i)=>s.visible=i<n);return list}
 set(s,k,x,y,sx,sy=Math.abs(sx),alpha=1){const T=this.tex;if(s.texture!==T[k])s.texture=T[k];s.position.set(x,y);s.scale.set(sx,sy);s.alpha=alpha;s.visible=true}
 render(){const e=this.engine,step=Math.floor(e.clock*4)%2,rowY=Core.rowY;
  // River: lunch trays laid end to end for logs, pet turtles that sink in the diving groups, and the crocodile.
  const river=[];for(const lane of Object.values(e.lanes)){if(lane.row>5)continue;const y=rowY(lane.row);
   for(const o of lane.items){const x0=C.left+o.x,len=o.len*CELL;if(x0>C.left+FW||x0+len<C.left)continue;
    if(o.kind==='log'){const n=Math.max(1,Math.round(o.len/1.5)),w=len/n;for(let i=0;i<n;i++)river.push(['tray',x0+w*(i+.5),y,(w+4)/this.tex.tray.width])}
    else if(o.kind==='croc')river.push(['croc',x0+len/2,y,len*1.05/this.tex.croc.width]);
    else{const st=e.diveState(o),k=st==='up'?(step?'turtle-a':'turtle-b'):'turtle-dive';for(let i=0;i<o.len;i++)river.push([k,x0+CELL*(i+.5),y,-this.k.turtle,st==='under'?.22:1])}}}
  const rp=this.pool(this.riverLayer,this.riverSprites??=[],river.length,'tray');river.forEach(([k,x,y,sx,a],i)=>this.set(rp[i],k,x,y,sx,Math.abs(sx),a??1));
  this.riverLayer.addChild(this.ladySprite);const l=e.lady;this.ladySprite.visible=!!l;if(l)this.set(this.ladySprite,'lady',e.ladyX(),rowY(C.lady.row)-4,this.k.frog*.82*(l.vdir<0?-1:1));
  // Jars on the shelf: empty, holding a frog home, or the crocodile peeking and rising; the fly hovers over its jar.
  const jp=this.pool(this.jarLayer,this.jarSprites??=[],5,'jar');e.homes.forEach((h,i)=>{const c=e.croc?.bay===i?e.croc:null,k=h?'jar-frog':c?(c.t>=C.croc.peek?'jar-croc':'jar-croc-peek'):'jar';
   const s=jp[i];this.set(s,k,Core.bayX(i),C.top+CELL+2,this.k.jar);s.anchor.set(.5,1)});
  this.flySprite.visible=!!e.fly;if(e.fly)this.set(this.flySprite,'fly',Core.bayX(e.fly.bay)+Math.sin(e.clock*7)*4,C.top+CELL*.45+Math.cos(e.clock*9)*3,CELL*.55/this.tex.fly.width);
  // Hallway: classmates and carts, drawn facing the way their lane runs.
  const road=[];for(const lane of Object.values(e.lanes)){if(lane.row<7)continue;const k=TRAFFIC[lane.kind],dir=Math.sign(lane.v);
   for(const o of lane.items){const x=C.left+o.x+o.len*CELL/2;if(x<C.left-CELL*2||x>C.left+FW+CELL*2)continue;road.push([k,x,rowY(lane.row)+CELL/2-1,dir,lane.row])}}
  road.sort((a,b)=>a[4]-b[4]);const tp=this.pool(this.trafficLayer,this.trafficSprites??=[],road.length,'cart');
  road.forEach(([k,x,y,dir],i)=>{const s=tp[i];this.set(s,k,x,y,this.k.traffic[k]*dir,this.k.traffic[k]);s.anchor.set(.5,1)});
  // Her frog: sitting, or mid-leap when hopping sideways; it hops in an arc and flashes away when lost.
  const f=e.frog,p=this.player,hop=f.hop,u=hop?Math.min(1,hop.t/C.hopTime):1,fx=hop?hop.fromX+(f.x-hop.fromX)*u:f.x,fy=hop?rowY(hop.fromRow)+(rowY(f.row)-rowY(hop.fromRow))*u:rowY(f.row),lift=hop?Math.sin(u*Math.PI)*10:0;
  const side=f.dir==='left'||f.dir==='right',flip=f.dir==='left'?-1:1;
  if(hop&&side)this.set(p,'frog-leap',fx,fy-lift,this.k.frog*1.1*flip,this.k.frog*1.1);else this.set(p,'frog',fx,fy-lift,this.k.frog*flip,this.k.frog*(hop?1.12:1));
  p.visible=e.state==='play';this.rider.visible=p.visible&&f.lady;if(this.rider.visible)this.set(this.rider,'lady',fx+3,fy-lift-CELL*.32,this.k.frog*.6);
  const fx2=this.puffs.filter(q=>q.dead),dp=this.pool(this.fxLayer,this.fxSprites??=[],fx2.length,'splat');fx2.forEach((q,i)=>this.set(dp[i],q.dead,q.x,q.y,CELL*1.2/this.tex[q.dead].width,CELL*1.2/this.tex[q.dead].width,Math.min(1,q.life*2)));
  const pts=this.puffs.find(q=>q.text);this.pointsText.text=pts?pts.text:'';if(pts)this.pointsText.position.set(pts.x,pts.y-(1-pts.life)*12);
  // The frog's timer: a colored-pencil bar under the board that shrinks as time runs out, red in the last five seconds.
  const tb=this.timeBar,frac=Math.max(0,e.time/C.time),bw=FW*.62,bx=C.left+FW-bw,by=C.top+FH+16;tb.clear().rect(bx+bw*(1-frac),by,bw*frac,12).fill({color:e.time<5?0xc8463c:0x6aa84f,alpha:.75}).rect(bx,by,bw,12).stroke({width:2,color:INK,alpha:.85});
  this.timeText.text='time';
  this.scoreText.text=String(e.score).padStart(5,'0');this.livesText.text='frogs '+Math.max(0,e.lives)+'   level '+e.level;
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='final grade.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  else if(e.state==='cleared'){msg='all five in the jars.'}
  // Like the cabinet's TIME OVER: a frog lost to the clock says so.
  else if(e.state==='dead'&&this.cause==='time'){msg='out of time.'}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.livesText,this.bestText,this.pointsText,this.timeText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  this.scoreText.position.set(16,4);this.livesText.position.set(W-16,14);this.bestText.position.set(W/2,6);this.timeText.position.set(C.left+FW*.38-12,C.top+FH+22);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.livesText,this.bestText,this.pointsText,this.timeText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class FroggologyAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1981){if(this.api)return this.api;const frame=document.createElement('div');frame.id='froggology-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new FroggologyGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>FroggologyTests.run(FroggologyCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.held={};this.game.tap=null;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);removeEventListener('blur',game.onBlur);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2Froggology={Adapter:FroggologyAdapter,Game:FroggologyGame,art};
})(globalThis);
