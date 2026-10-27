'use strict';
// Recess Zone play page: runs RecessZoneCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe). Like the 1980 cabinet's vector screen, the 3D world is drawn as lines: her green colored-pencil
// wireframes of playground equipment and tanks over her paper, with her drawn horizon, moon, radar and cracked
// periscope glass (battlezone-horizon, battlezone-sprites).
(function(g){
const ID='recess-zone',C=RecessZoneCore.CONFIG,W=C.width,H=C.height,INK=0x22355a,GREEN=0x2d8a3e,HY=H*.47,F=760,EYE=2,NEAR=1,FAR=170;
const art={horizon:"@@asset:assets/battlezone/horizon.webp@@",moon:"@@asset:assets/battlezone/moon.webp@@",radar:"@@asset:assets/battlezone/radar.webp@@",crack:"@@asset:assets/battlezone/crack.webp@@"};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS={up:['ArrowUp','w','W'],down:['ArrowDown','s','S'],left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],fire:[' ']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}
// Wireframe models: lists of edges [[x,y,z],[x,y,z]] with z forward, x right, y up.
const box=(x0,x1,y0,y1,z0,z1)=>{const p=[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]];return [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].map(([a,b])=>[p[a],p[b]])};
const loop=pts=>pts.map((p,i)=>[p,pts[(i+1)%pts.length]]);
const MODELS={
 tank:[...loop([[-3,0,-4],[3,0,-4],[3,0,4],[-3,0,4]]),...loop([[-2.2,1.5,-3],[2.2,1.5,-3],[2.2,1.5,3.4],[-2.2,1.5,3.4]]),[[-3,0,-4],[-2.2,1.5,-3]],[[3,0,-4],[2.2,1.5,-3]],[[3,0,4],[2.2,1.5,3.4]],[[-3,0,4],[-2.2,1.5,3.4]],...box(-1.2,1.2,1.5,2.6,-1.5,1.2),[[0,2.1,1.2],[0,2.1,5.5]],[[-.3,2.1,5.5],[.3,2.1,5.5]]],
 super:[...loop([[-2.6,0,-4],[2.6,0,-4],[1.8,0,4.6],[-1.8,0,4.6]]),...loop([[-1.6,1.3,-3.2],[1.6,1.3,-3.2],[.9,1.3,3.6],[-.9,1.3,3.6]]),[[-2.6,0,-4],[-1.6,1.3,-3.2]],[[2.6,0,-4],[1.6,1.3,-3.2]],[[1.8,0,4.6],[.9,1.3,3.6]],[[-1.8,0,4.6],[-.9,1.3,3.6]],[[0,1.6,0],[0,1.6,6]],[[0,1.3,-1],[0,2.2,-.6]],[[0,2.2,-.6],[0,1.6,1.4]]],
 missile:[...loop([[-.7,0,-3],[.7,0,-3],[.7,0,2],[-.7,0,2]]),...loop([[-.7,1,-3],[.7,1,-3],[.7,1,2],[-.7,1,2]]),[[-.7,0,2],[0,.5,4]],[[.7,0,2],[0,.5,4]],[[-.7,1,2],[0,.5,4]],[[.7,1,2],[0,.5,4]],[[0,1,-3],[0,2.2,-3.6]],[[0,2.2,-3.6],[0,1,-1.6]],[[-.7,.5,-3],[-1.8,.2,-3.6]],[[.7,.5,-3],[1.8,.2,-3.6]]],
 saucer:[...loop([[-4,0,0],[-2.8,0,2.8],[0,0,4],[2.8,0,2.8],[4,0,0],[2.8,0,-2.8],[0,0,-4],[-2.8,0,-2.8]]),...[[-4,0,0],[4,0,0],[0,0,4],[0,0,-4]].map(p=>[p,[0,1.6,0]]),...[[-4,0,0],[4,0,0],[0,0,4],[0,0,-4]].map(p=>[p,[0,-1,0]])],
 slide:[[[-1,0,-4],[-1,5,-4]],[[1,0,-4],[1,5,-4]],...[1,2,3,4].map(y=>[[-1,y,-4],[1,y,-4]]),[[-1,5,-4],[-1,0,4]],[[1,5,-4],[1,0,4]],[[-1,5,-4],[1,5,-4]],[[-1,0,4],[1,0,4]]],
 swings:[[[-4,0,-1.5],[-4,5,0]],[[-4,0,1.5],[-4,5,0]],[[4,0,-1.5],[4,5,0]],[[4,0,1.5],[4,5,0]],[[-4,5,0],[4,5,0]],[[-2,5,0],[-2,1.4,0]],[[-1,5,0],[-1,1.4,0]],[[-2.2,1.4,0],[-.8,1.4,0]],[[1,5,0],[1,1.4,0]],[[2,5,0],[2,1.4,0]],[[.8,1.4,0],[2.2,1.4,0]]],
 climber:[...box(-2.5,2.5,0,4,-2.5,2.5),[[-2.5,2,-2.5],[2.5,2,-2.5]],[[-2.5,2,2.5],[2.5,2,2.5]],[[-2.5,2,-2.5],[-2.5,2,2.5]],[[2.5,2,-2.5],[2.5,2,2.5]],[[0,0,-2.5],[0,4,-2.5]],[[0,0,2.5],[0,4,2.5]]],
 box:box(-2.5,2.5,0,3.5,-2.5,2.5),
 pyramid:[...loop([[-3,0,-3],[3,0,-3],[3,0,3],[-3,0,3]]),...[[-3,0,-3],[3,0,-3],[3,0,3],[-3,0,3]].map(p=>[p,[0,5,0]])]};

// The cabinet's sounds: the engine idle, the cannon, the enemy's shot, a hit, the radar ping and the saucer's warble.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.engine=0;this.ping=0}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('recess-zone',e))return;
  if(e.type==='fire')b.noise(.25,900,.07);else if(e.type==='enemy-fire')b.noise(.2,600,.04);
  else if(e.type==='kill')b.noise(.7,400,.08);else if(e.type==='death')b.noise(1.2,250,.1);
  else if(e.type==='bump')b.tone(90,.08,.03,'square');else if(e.type==='shell-blocked')b.noise(.15,300,.04);else if(e.type==='bonus-tank')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09)}
 loop(engine,dt,moving){if(!this.on()||engine.state!=='play')return;this.engine-=dt;if(this.engine<=0){this.engine=moving?.07:.12;this.bus.noise(.08,moving?160:90,.02)}
  if(engine.enemy){this.ping-=dt;if(this.ping<=0){this.ping=1.2;this.bus.tone(1100,.04,.02,'sine')}}
  if(engine.saucer){this.warble=(this.warble||0)-dt;if(this.warble<=0){this.warble=.16;this.flip=!this.flip;this.bus.tone(this.flip?720:860,.15,.012,'sine')}}}
}

class ZoneGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.debris=[];this.sounds=new Sounds(services)}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const [k,v] of Object.entries(art))this.tex[k]=await texture(P,v);
  // Her horizon strip at its own proportions, five copies round the full turn of the turret, so it turns at the same
  // rate as the wireframes (F pixels per radian) and its foot sits on the ground line.
  const hz=this.tex.horizon,tw=Math.PI*2*F/5,th=tw*hz.height/hz.width;this.horizon=new P.TilingSprite({texture:hz,width:W,height:th});this.horizon.tileScale.set(tw/hz.width,th/hz.height);this.horizon.position.set(0,HY-th*.9);app.stage.addChild(this.horizon);
  this.moon=new P.Sprite(this.tex.moon);this.moon.anchor.set(.5);this.moon.scale.set(54/this.tex.moon.width);app.stage.addChild(this.moon);
  const ground=new P.Graphics().moveTo(0,HY).lineTo(W,HY).stroke({width:2,color:GREEN,alpha:.8});app.stage.addChild(ground);
  this.lines=new P.Graphics();app.stage.addChild(this.lines);
  this.radar=new P.Sprite(this.tex.radar);this.radar.anchor.set(.5);this.radar.scale.set(130/this.tex.radar.width);this.radar.position.set(W/2,82);app.stage.addChild(this.radar);
  this.blips=new P.Graphics();app.stage.addChild(this.blips);
  this.reticle=new P.Graphics();app.stage.addChild(this.reticle);
  this.crack=new P.Sprite(this.tex.crack);this.crack.anchor.set(.5);this.crack.scale.set(620/this.tex.crack.width);this.crack.position.set(W/2,H/2);this.crack.visible=false;app.stage.addChild(this.crack);
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'});
  this.hud=new P.Container();app.stage.addChild(this.hud);
  const text=(size,ax=.5,ay=0)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,ay);this.hud.addChild(t);return t};
  this.scoreText=text(52,0);this.livesText=text(22,1);this.bestText=text(22,1);this.warn=text(22,0);this.message=text(52,.5,.5);this.sub=text(30,.5,.5);
  this.onKey=e=>this.key(e,true);this.offKey=e=>this.key(e,false);addEventListener('keydown',this.onKey);addEventListener('keyup',this.offKey);this.touch=g.No2TouchPad?.(this,app.canvas,W,H)||{fingers:new Map(),stick:()=>({x:0,y:0,d:0}),dir4:()=>null,take:k=>k==='twos'?0:[]};this.onBlur=()=>{this.held={}};addEventListener('blur',this.onBlur);
  this.tracing=await g.No2Tracing?.attach(P,app,this.hud,{quiet:[this.message,this.sub]});this.newGame(this.seed);app.ticker.add(t=>this.frame(t.deltaMS/1000));return this}
 inputEnabled(){return !g.No2||g.No2.gameInputEnabled?.()!==false}
 // A key let go while a dialog has the input still counts as let go, so nothing stays held after it closes.
 key(e,down){if(!this.inputEnabled()){if(!down)this.held={};return}const k=e.key;
  // Initials: letters typed on the keyboard go straight in (owner 2026-10-25), so no letter moves or pauses here.
  if(this.mode==='initials'){if(down){e.preventDefault();if(!e.repeat||k.startsWith('Arrow'))this.edge(k)}return}
  if(down&&(k==='p'||k==='P')){this.pause();e.preventDefault();return}
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){this.held[name]=down;e.preventDefault()}
  // A quick tap can go down and up between two frames; latch it so every press fires.
  if(down&&!e.repeat&&KEYS.fire.includes(k))this.tap=true;
  if(down&&!e.repeat)this.edge(k)}
 edge(k){if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller: both sticks pushed up and down drive the two treads like the cabinet's levers; or one stick steers alone.
 // A or RT fires; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,dz=v=>Math.abs(v)<.18?0:Math.sign(v)*Math.min(1,(Math.abs(v)-.18)/.72);
   const lx=dz(p.axes[0]||0),ly=-dz(p.axes[1]||0),ry=-dz(p.axes[3]||0);if(ry)now.treads=[ly,ry];else{now.turn=lx+(b(15)?1:0)-(b(14)?1:0);now.move=ly+(b(12)?1:0)-(b(13)?1:0)}
   now.fire=b(0)||(p.buttons[7]?.value||0)>.5;now.a=b(0);now.pause=b(9);now.up=b(12)||(p.axes[1]||0)<-.5;now.down=b(13)||(p.axes[1]||0)>.5}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.a&&!this.pad.a)this.edge(' ')}
  this.pad=now}
 // Fire counts only once it has been let go since play resumed, so the A that starts the page does not shoot.
 // Touch: drag to drive (push up to go forward, down to reverse, sideways to turn); a tap fires. A key tap shorter than a frame still counts once.
 input(){const h=this.held,p=this.pad,s=this.touch.stick(),fire=!!(h.fire||p.fire||this.tap||this.touch.take('taps').length);this.tap=false;if(!fire)this.armed=true;const out={fire:fire&&this.armed};
  if(p.treads&&!h.up&&!h.down&&!h.left&&!h.right){const [l,r]=p.treads;out.move=(l+r)/2;out.turn=(l-r)/2}else{out.turn=((h.right?1:0)-(h.left?1:0))||p.turn||s.x;out.move=((h.up?1:0)-(h.down?1:0))||p.move||-s.y}return out}
 newGame(seed=this.seed){this.seed=seed;this.engine=new RecessZoneCore.ZoneEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,RecessZoneCore)||null;this.armed=false;this.tap=false;this.paused=false;this.debris=[];if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);this.readPad();let moving=false;
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);moving=!!(input.move||input.turn);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt,moving);if(this.engine.state==='end')this.endGame()}
  for(const d of this.debris){d.t+=dt}this.debris=this.debris.filter(d=>d.t<1.6);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(ev.type==='kill')this.debris.push({x:ev.x,z:ev.z,t:0,parts:Array.from({length:10},(_,i)=>({a:i*.63+Math.random()*.3,v:6+Math.random()*8,up:6+Math.random()*8,spin:Math.random()*6}))});
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 // Camera space: X right, Z forward from the player's tank.
 cam(wx,wy,wz){const p=this.engine.player,rx=RecessZoneCore.wrap(wx-p.x),rz=RecessZoneCore.wrap(wz-p.z),c=Math.cos(p.a),s=Math.sin(p.a);return[rx*c-rz*s,wy,rx*s+rz*c]}
 seg(gr,a,b){let [x0,y0,z0]=a,[x1,y1,z1]=b;if(z0<NEAR&&z1<NEAR)return;if(z0>FAR&&z1>FAR)return;
  if(z0<NEAR){const t=(NEAR-z0)/(z1-z0);x0+=(x1-x0)*t;y0+=(y1-y0)*t;z0=NEAR}if(z1<NEAR){const t=(NEAR-z1)/(z0-z1);x1+=(x0-x1)*t;y1+=(y0-y1)*t;z1=NEAR}
  gr.moveTo(W/2+x0/z0*F,HY-(y0-EYE)/z0*F).lineTo(W/2+x1/z1*F,HY-(y1-EYE)/z1*F)}
 model(gr,o,kind,y=0){const m=MODELS[kind],c=Math.cos(o.a),s=Math.sin(o.a),w=([lx,ly,lz])=>this.cam(o.x+lx*c+lz*s,ly+y,o.z-lx*s+lz*c);for(const [a,b] of m)this.seg(gr,w(a),w(b))}
 render(){const e=this.engine,p=e.player,gr=this.lines;gr.clear();
  this.horizon.tilePosition.x=-p.a*F;const moonOff=RecessZoneCore.angDiff(.9,p.a);this.moon.visible=Math.abs(moonOff)<.8;this.moon.position.set(W/2+Math.tan(moonOff)*F,HY-176);
  for(const o of e.obstacles)this.model(gr,o,o.kind);
  if(e.enemy)this.model(gr,e.enemy,e.enemy.kind,e.enemy.kind==='missile'?e.enemy.y-1:0);
  if(e.saucer)this.model(gr,{...e.saucer,a:e.clock*2},'saucer',4+Math.sin(e.clock*2));
  for(const s of [e.shell,e.enemyShell].filter(Boolean)){const a=this.cam(s.x,1.6,s.z),b=this.cam(s.x-Math.sin(s.a)*1.6,1.6,s.z-Math.cos(s.a)*1.6);this.seg(gr,a,b)}
  for(const d of this.debris)for(const q of d.parts){const r=q.v*d.t,y=Math.max(0,q.up*d.t-6*d.t*d.t),cx=d.x+Math.sin(q.a)*r,cz=d.z+Math.cos(q.a)*r,l=.8;this.seg(gr,this.cam(cx-l*Math.cos(q.spin*d.t),y,cz),this.cam(cx+l*Math.cos(q.spin*d.t),y+l,cz+l*Math.sin(q.spin*d.t)))}
  gr.stroke({width:2,color:GREEN,alpha:.95,cap:'round'});
  // Radar: blips by bearing and range; the reticle in the middle of the periscope.
  const bl=this.blips;bl.clear();for(const r of e.radar()){if(r.range>140)continue;const d=r.range/140*58;bl.circle(W/2+Math.sin(r.bearing)*d,82-Math.cos(r.bearing)*d,3.5)}bl.fill({color:0xc0392b});
  const rt=this.reticle;rt.clear();const cx=W/2,cy=HY;rt.moveTo(cx,cy-70).lineTo(cx,cy-30).moveTo(cx,cy+30).lineTo(cx,cy+70).moveTo(cx-60,cy-70).lineTo(cx-60,cy-58).lineTo(cx+60,cy-58).lineTo(cx+60,cy-70).moveTo(cx-60,cy+70).lineTo(cx-60,cy+58).lineTo(cx+60,cy+58).lineTo(cx+60,cy+70);rt.stroke({width:2,color:INK,alpha:.7});
  this.crack.visible=e.state==='dead';
  const r0=e.radar().find(r=>r.kind!=='saucer');this.warn.text=!r0||e.state!=='play'?'':Math.abs(r0.bearing)<.35&&r0.range<110?'enemy in range':Math.abs(r0.bearing)>2.3?'enemy to rear':r0.bearing<0?'enemy to left':'enemy to right';
  this.scoreText.text=String(e.score).padStart(2,'0');this.livesText.text='tanks '+Math.max(0,e.lives);
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='recess is over.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.livesText,this.bestText,this.warn])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  this.scoreText.position.set(30,14);this.livesText.position.set(W-30,20);this.bestText.position.set(W-30,20+px(22)*1.4);this.warn.position.set(30,14+px(52)*1.25);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.livesText,this.bestText,this.warn,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class ZoneAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1980){if(this.api)return this.api;const frame=document.createElement('div');frame.id='battlezone-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new ZoneGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>RecessZoneTests.run(RecessZoneCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.armed=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);removeEventListener('blur',game.onBlur);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2RecessZone={Adapter:ZoneAdapter,Game:ZoneGame,art};
})(globalThis);
