'use strict';
// Quiz play page: runs QuizCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page (no iframe),
// over her blank quiz sheet: a field of answer bubbles, claimed shapes hatched in blue (fast) or purple (slow) colored
// pencil, her lines in ballpoint, and the Qix as a red ballpoint scribble, all drawn in code like the cabinet's lines;
// her pencil is the marker, ink sparks are the Sparx (red when Super) and a pink cap eraser is the Fuse (quiz-sprites).
(function(g){
const ID='quiz',C=QuizCore.CONFIG,W=C.width,H=C.height,INK=0x22355a,PURPLE=0x6b3fa8,RED=0xd8283f,FW=C.cols*C.cell,FH=C.rows*C.cell;
const {px,py,col,row}=QuizCore;
const names=['pencil','scribble','sparx-a','sparx-b','super-a','super-b','eraser-a','eraser-b','crumbs'];
const art={pencil:"@@asset:assets/qix/pencil.webp@@",scribble:"@@asset:assets/qix/scribble.webp@@","sparx-a":"@@asset:assets/qix/sparx-a.webp@@","sparx-b":"@@asset:assets/qix/sparx-b.webp@@","super-a":"@@asset:assets/qix/super-a.webp@@","super-b":"@@asset:assets/qix/super-b.webp@@","eraser-a":"@@asset:assets/qix/eraser-a.webp@@","eraser-b":"@@asset:assets/qix/eraser-b.webp@@",crumbs:"@@asset:assets/qix/crumbs.webp@@"};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],up:['ArrowUp','w','W'],down:['ArrowDown','s','S'],fast:[' '],slow:['Shift']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}
// Colored-pencil hatching: short diagonal strokes on a light wash, tiled.
function hatch(color,wash){const c=document.createElement('canvas');c.width=c.height=48;const x=c.getContext('2d');x.fillStyle=wash;x.fillRect(0,0,48,48);x.strokeStyle=color;x.lineCap='round';
 let s=7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;for(let i=-48;i<96;i+=5){x.globalAlpha=.35+rnd()*.4;x.lineWidth=1.2+rnd()*1.3;x.beginPath();x.moveTo(i+rnd()*2,48);x.lineTo(i+48+rnd()*2,0);x.stroke()}return c}

// The cabinet's sounds: the Qix's restless whine, the drawing hum, the claim, the Fuse's hiss and the Sparx.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.beat=0;this.hum=0}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('quiz',e))return;
  if(e.type==='claim')for(let i=0;i<4;i++)b.tone((e.slow?520:660)+i*160,.07,.03,'square',i*.06);
  else if(e.type==='draw')b.tone(e.slow?220:330,.05,.02,'triangle');
  else if(e.type==='fuse')b.noise(.3,3000,.03);
  else if(e.type==='super')for(let i=0;i<6;i++)b.tone(1400-i*120,.05,.025,'sawtooth',i*.05);
  else if(e.type==='sparx')b.tone(1600,.06,.02,'square');
  else if(e.type==='split')for(let i=0;i<8;i++)b.tone(660+i*110,.06,.035,'square',i*.07);
  else if(e.type==='cleared')for(let i=0;i<5;i++)b.tone(523*(1+i*.25),.09,.03,'triangle',i*.1);
  else if(e.type==='death')b.noise(.9,300,.09);
  else if(e.type==='extra')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09)}
 loop(engine,dt){if(!this.on()||engine.state!=='play')return;this.beat-=dt;if(this.beat<=0){this.beat=.11;const q=engine.qix[0];this.bus.gameTone('quiz','qix-voice',260+Math.abs(Math.sin(engine.clock*3+q.a.x*.01))*420,.09,.008,'sine')}
  if(engine.drawing){this.hum-=dt;if(this.hum<=0){this.hum=.09;if(engine.fuse)this.bus.gameNoise('quiz','fuse-voice',.08,2600,.015);else this.bus.gameTone('quiz','draw-voice',engine.drawing.slow?140:190,.08,.01,'square')}}}
}

class QuizGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.sounds=new Sounds(services);this.puffs=[];this.dirty=true;this.lastClear=null}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const k of names)this.tex[k]=await texture(P,art[k]);
  // The answer sheet's bubbles, printed in light ink across the field.
  const bubbles=new P.Graphics();for(let y=C.top+18;y<C.top+FH-8;y+=26)for(let x=C.left+18;x<C.left+FW-8;x+=26)bubbles.circle(x,y,6.5)
  bubbles.stroke({width:1.4,color:0x3b55a8,alpha:.32});app.stage.addChild(bubbles);
  // Claimed shapes: painted once per claim into a canvas the size of the field.
  const cv=document.createElement('canvas');cv.width=FW*2;cv.height=FH*2;this.fillCanvas=cv;this.fillCtx=cv.getContext('2d');
  this.patterns={2:this.fillCtx.createPattern(hatch('#2f5fc4','rgba(120,160,230,.32)'),'repeat'),3:this.fillCtx.createPattern(hatch('#6b3fa8','rgba(160,120,220,.32)'),'repeat')};
  this.fillTex=P.Texture.from(cv);this.fill=new P.Sprite(this.fillTex);this.fill.position.set(C.left,C.top);this.fill.scale.set(.5);app.stage.addChild(this.fill);
  this.lines=new P.Graphics();app.stage.addChild(this.lines);
  this.qixG=new P.Graphics();app.stage.addChild(this.qixG);
  const layer=()=>{const c=new P.Container();app.stage.addChild(c);return c};
  this.sparxLayer=layer();
  const sprite=(t,ax=.5,ay=.5)=>{const s=new P.Sprite(this.tex[t]);s.anchor.set(ax,ay);app.stage.addChild(s);return s};
  this.fuse=sprite('eraser-a',.3,.75);this.fuse.scale.set(54/this.tex['eraser-a'].width);
  // Her pencil writes with its tip, at the bottom left of the drawing.
  this.player=sprite('pencil',.05,.95);this.player.scale.set(64/this.tex.pencil.height);
  this.fxLayer=layer();
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'});
  this.hud=layer();const text=(size,ax=.5,ay=0)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,ay);this.hud.addChild(t);return t};
  this.scoreText=text(52,0);this.livesText=text(22,1);this.pctText=text(22,1);this.bestText=text(22);this.pointsText=text(22);this.message=text(52,.5,.5);this.sub=text(30,.5,.5);
  this.onKey=e=>this.key(e,true);this.offKey=e=>this.key(e,false);addEventListener('keydown',this.onKey);addEventListener('keyup',this.offKey);this.touch=g.No2TouchPad?.(this,app.canvas,W,H)||{fingers:new Map(),stick:()=>({x:0,y:0,d:0}),dir4:()=>null,take:k=>k==='twos'?0:[]};this.onBlur=()=>{this.held={}};addEventListener('blur',this.onBlur);
  this.tracing=await g.No2Tracing?.attach(P,app,this.hud,{quiet:[this.message,this.sub]});this.newGame(this.seed);app.ticker.add(t=>this.frame(t.deltaMS/1000));return this}
 inputEnabled(){return !g.No2||g.No2.gameInputEnabled?.()!==false}
 key(e,down){if(!this.inputEnabled()){if(!down)this.held={};return}const k=e.key;
  // Initials: letters typed on the keyboard go straight in (owner 2026-10-25), so no letter moves or pauses here.
  if(this.mode==='initials'){if(down){e.preventDefault();if(!e.repeat||k.startsWith('Arrow'))this.edge(k)}return}
  if(down&&(k==='p'||k==='P')){this.pause();e.preventDefault();return}
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){this.held[name]=down;e.preventDefault()}
  if(down&&!e.repeat)this.edge(k)}
 // For a moment after the game ends a button still being mashed neither types initials nor restarts.
 edge(k){if(this.endHold>0)return;if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller: stick (with a dead zone) or D-pad moves; A draws fast, X draws slow; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0,dz=v=>Math.abs(v)<.25?0:Math.sign(v)*Math.min(1,(Math.abs(v)-.25)/.65);
   now.axis=dz(x);now.axisY=dz(y);now.left=b(14);now.right=b(15);now.up=b(12)||y<-.5;now.down=b(13)||y>.5;now.dup=b(12);now.ddown=b(13);now.fire=b(0);now.slow=b(2);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.fire&&!this.pad.fire)this.edge(' ')}
  this.pad=now}
 // The draw buttons count only once they have been let go since play resumed, so the A that starts the page does not draw.
 // Touch: drag to move, drawing fast once the marker leaves the edge; with a second finger held it draws slow.
 input(){const pad=this.pad,h=this.held,s=this.touch.stick(),two=this.touch.fingers.size>1,fast=!!(h.fast||pad.fire||s.f&&!two),slow=!!(h.slow||pad.slow||two);if(!fast&&!slow)this.fireArmed=true;
  const kx=(h.right||pad.right?1:0)-(h.left||pad.left?1:0),ky=(h.down||pad.ddown?1:0)-(h.up||pad.dup?1:0);return{axis:kx||pad.axis||s.x,axisY:ky||pad.axisY||s.y,fast:fast&&this.fireArmed,slow:slow&&this.fireArmed}}
 newGame(seed=this.seed){this.seed=seed;this.engine=new QuizCore.QixEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,QuizCore)||null;this.paused=false;this.puffs=[];this.dirty=true;this.lastClear=null;if(this.mode!=='demo')this.mode='play';this.initials=null}
 // Like the cabinet, the marker only runs along the edge; pushing into the open field does nothing until a draw button is
 // held. A player pushing in without it for half a second gets a short hint by the marker (a few times a game, not on touch).
 drawHint(input,at){const push=Math.abs(input.axis||0)>.5||Math.abs(input.axisY||0)>.5,e=this.engine;
  if(!push||input.fast||input.slow||e.state!=='play'||e.marker.c!==at||g.No2?.deviceMode==='touch'){this.stuck=0;return}
  this.stuck=(this.stuck||0)+C.step;this.hintLeft??=3;if(this.stuck<.5||this.hintLeft<=0||(this.hintAt&&e.clock-this.hintAt<6))return;
  this.stuck=0;this.hintLeft--;this.hintAt=e.clock;const col=at%C.cols,row=Math.floor(at/C.cols),x=Math.max(170,Math.min(W-170,C.left+col*C.cell)),y=Math.max(C.top+90,C.top+row*C.cell-70);
  this.puffs.push({x,y,life:2.4,size:.01,tex:'crumbs',text:g.No2?.deviceMode==='xbox'?'hold A to draw':'hold Space to draw'})}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);if(this.endHold>0)this.endHold-=dt;this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);const at=this.engine.marker.c;this.engine.step(C.step,input);if(!this.ai)this.drawHint(input,at);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);if(this.engine.state==='end')this.endGame()}
  for(const f of this.puffs)f.life-=dt;this.puffs=this.puffs.filter(f=>f.life>0);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(ev.type==='claim'||ev.type==='level')this.dirty=true;
   if(ev.type==='claim')this.puffs.push({x:ev.x,y:ev.y,life:.6,size:56,tex:'crumbs',text:String(ev.points)});
   if(ev.type==='level')this.lastClear=null;if(ev.type==='cleared')this.lastClear=ev;
   if(ev.type==='death')this.puffs.push({x:ev.x,y:ev.y,life:1.2,size:90,tex:'scribble'});
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}this.endHold=.9;const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 // Repaints the claimed shapes: hatched fills, then ink along every edge between claimed and open field (and between fast and slow).
 paintFill(){const e=this.engine,x=this.fillCtx,v=e.v,k=C.cell*2,X=C.cols,Y=C.rows;x.clearRect(0,0,this.fillCanvas.width,this.fillCanvas.height);
  for(const t of [2,3]){const path=new Path2D();for(let r=0;r<Y;r++){let c=0;while(c<X){if(v[r*X+c]!==t){c++;continue}const s=c;while(c<X&&v[r*X+c]===t)c++;path.rect(s*k,r*k,(c-s)*k,k)}}x.fillStyle=this.patterns[t];x.fill(path)}
  const edges=(claimedOnly)=>{const path=new Path2D(),diff=(a,b)=>claimedOnly?(v[a]>0)!==(v[b]>0):v[a]>1&&v[b]>1&&v[a]!==v[b];
   for(let r=0;r<Y-1;r++){let c=0;while(c<X){if(!diff(r*X+c,(r+1)*X+c)){c++;continue}const s=c;while(c<X&&diff(r*X+c,(r+1)*X+c))c++;path.moveTo(s*k,(r+1)*k);path.lineTo(c*k,(r+1)*k)}}
   for(let c=0;c<X-1;c++){let r=0;while(r<Y){if(!diff(r*X+c,r*X+c+1)){r++;continue}const s=r;while(r<Y&&diff(r*X+c,r*X+c+1))r++;path.moveTo((c+1)*k,s*k);path.lineTo((c+1)*k,r*k)}}return path};
  x.lineCap='round';x.strokeStyle='rgba(60,60,140,.45)';x.lineWidth=2.5;x.stroke(edges(false));x.strokeStyle='#22355a';x.lineWidth=4.5;x.stroke(edges(true));
  // Her double border around the sheet, as in her drawing.
  x.lineWidth=4;x.strokeRect(2,2,FW*2-4,FH*2-4);
  this.fillTex.source.update();this.dirty=false}
 pool(layer,list,n,t){while(list.length<n){const s=new this.P.Sprite(this.tex[t]);s.anchor.set(.5);layer.addChild(s);list.push(s)}list.forEach((s,i)=>s.visible=i<n);return list}
 render(){const e=this.engine,T=this.tex,step=Math.floor(e.clock*8)%2;if(this.dirty)this.paintFill();
  // The unfinished line, in ballpoint (purple pencil when slow); the Fuse's eraser rubs it out from its start.
  const L=this.lines.clear(),D=e.drawing;this.fuse.visible=false;
  if(D){const pts=[D.start,...D.cells],from=e.fuse?Math.min(e.fuse.k,pts.length-1):0;L.moveTo(px(pts[from]),py(pts[from]));
   for(let i=from+1;i<pts.length;i++){const a=pts[i-1],b=pts[i],c=pts[i+1];if(c===undefined||col(c)-col(b)!==col(b)-col(a)||row(c)-row(b)!==row(b)-row(a))L.lineTo(px(b),py(b))}
   L.stroke({width:3,color:D.slow?PURPLE:INK,cap:'round',join:'round'});
   if(e.fuse){const f=this.fuse,t=step?'eraser-a':'eraser-b';f.visible=true;if(f.texture!==T[t])f.texture=T[t];f.position.set(px(pts[from]),py(pts[from]))}}
  // The Qix: her red ballpoint scribble, every remembered line drawn as a stroke that curls back on itself, older ones fainter.
  const Q=this.qixG.clear();for(const q of e.qix){const tr=[...q.trail,[q.a.x,q.a.y,q.b.x,q.b.y]];tr.forEach(([ax,ay,bx,by],i)=>{const dx=bx-ax,dy=by-ay,s=(i%2?1:-1)*(.55+.35*Math.sin(e.clock*4+i*1.7)),t=.4*Math.cos(e.clock*3+i);
   Q.moveTo(ax,ay).bezierCurveTo(bx-dy*s+dx*t,by+dx*s+dy*t,ax+dy*s-dx*t,ay-dx*s-dy*t,bx,by).stroke({width:2.2,color:RED,alpha:.3+.7*(i+1)/tr.length,cap:'round'})})}
  const sp=this.pool(this.sparxLayer,this.sparxSprites??=[],e.sparx.length,'sparx-a');
  e.sparx.forEach((s,i)=>{const o=sp[i],k=(s.super?'super-':'sparx-')+(step?'a':'b');if(o.texture!==T[k])o.texture=T[k];o.scale.set((s.super?46:38)/o.texture.width);o.rotation=e.clock*(s.super?5:3)+i;o.position.set(px(s.c),py(s.c))});
  const puffs=this.pool(this.fxLayer,this.puffSprites??=[],this.puffs.length,'crumbs');this.puffs.forEach((f,i)=>{const s=puffs[i];if(s.texture!==T[f.tex])s.texture=T[f.tex];s.position.set(f.x,f.y);s.scale.set(f.size/s.texture.width);s.alpha=Math.min(1,f.life*4)});
  this.player.visible=e.state!=='dead'||Math.floor(e.clock*10)%2===0;this.player.position.set(px(e.marker.c),py(e.marker.c));
  const hitText=this.puffs.find(f=>f.text);this.pointsText.text=hitText?hitText.text:'';if(hitText)this.pointsText.position.set(hitText.x,hitText.y-40);
  this.scoreText.text=String(e.score).padStart(5,'0');this.livesText.text='lives '+Math.max(0,e.lives)+'   level '+e.level;
  this.pctText.text='claimed '+e.percent+'% of '+C.threshold+'%'+(e.multiplier>1?'   x'+e.multiplier:'');
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='final grade.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  else if(e.state==='cleared'&&this.lastClear){const c=this.lastClear;msg=c.split?'split them up!':'graded: '+c.percent+'%';sub=c.split?'every shape now counts x'+e.multiplier:c.bonus?'bonus '+c.bonus:''}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.livesText,this.pctText,this.bestText,this.pointsText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  // The HUD sits clear of the top border, where the Sparx run.
  const lift=24;this.scoreText.position.set(C.left,Math.max(2,C.top-px(52)*1.25-lift));this.livesText.position.set(W-C.left,Math.max(2,C.top-px(22)*2.6-lift));this.pctText.position.set(W-C.left,Math.max(2+px(22)*1.25,C.top-px(22)*1.35-lift));this.bestText.position.set(W/2,Math.max(2,C.top-px(22)*1.35-lift));
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.livesText,this.pctText,this.bestText,this.pointsText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class QuizAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1981){if(this.api)return this.api;const frame=document.createElement('div');frame.id='quiz-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new QuizGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>QuizTests.run(QuizCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.held={};this.game.fireArmed=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);removeEventListener('blur',game.onBlur);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2Quiz={Adapter:QuizAdapter,Game:QuizGame,art};
})(globalThis);
