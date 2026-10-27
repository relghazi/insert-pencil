'use strict';
// Q*Nerd play page: runs QnerdCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over her isometric dot paper: a pyramid of stacked school books drawn in ballpoint and colored
// pencil in code, the nerd boy with his green backpack, basketballs, the purple dodgeball that hatches into the
// jump rope snake, the tennis ball, two chalkboard erasers, the stapler and the hole punch, and the frisbees
// (q-nerd-sprites).
(function(g){
const ID='q-nerd',Core=QnerdCore,C=Core.CONFIG,W=C.width,H=C.height,INK=0x22355a,PAGE=0xf3ecdc,CW=C.cubeW,HT=C.halfTop,SD=C.side;
const names=['nerd-front','nerd-front-hop','nerd-back','nerd-back-hop','curse','ball-red','ball-purple','ball-green','coily-a','coily-b','slick','sam','ugg','wrongway','disc-a','disc-b','dust','burst'];
const art={"nerd-front":"@@asset:assets/qbert/nerd-front.webp@@","nerd-front-hop":"@@asset:assets/qbert/nerd-front-hop.webp@@","nerd-back":"@@asset:assets/qbert/nerd-back.webp@@","nerd-back-hop":"@@asset:assets/qbert/nerd-back-hop.webp@@",curse:"@@asset:assets/qbert/curse.webp@@","ball-red":"@@asset:assets/qbert/ball-red.webp@@","ball-purple":"@@asset:assets/qbert/ball-purple.webp@@","ball-green":"@@asset:assets/qbert/ball-green.webp@@","coily-a":"@@asset:assets/qbert/coily-a.webp@@","coily-b":"@@asset:assets/qbert/coily-b.webp@@",slick:"@@asset:assets/qbert/slick.webp@@",sam:"@@asset:assets/qbert/sam.webp@@",ugg:"@@asset:assets/qbert/ugg.webp@@",wrongway:"@@asset:assets/qbert/wrongway.webp@@","disc-a":"@@asset:assets/qbert/disc-a.webp@@","disc-b":"@@asset:assets/qbert/disc-b.webp@@",dust:"@@asset:assets/qbert/dust.webp@@",burst:"@@asset:assets/qbert/burst.webp@@"};
// Book covers for each round: start, middle and target colours in colored pencil (no yellow).
const COVERS=[[0x6c8cc4,0x9a7cc0,0xc7574f],[0x7aa874,0x6c8cc4,0xc98a4b],[0xc7574f,0x7aa874,0x6c8cc4],[0x9a7cc0,0xc98a4b,0x7aa874]];
const SPINES=[0xa8553f,0x5e7fb3,0x6f9b6a,0x8c6bb0,0xb9784a,0x4f6f9a,0x9b4f5f];
// Sprite families: height (disc: width) in logical units, one scale per family.
const SIZE={nerd:92,ball:46,coily:128,eraser:50,office:58,disc:66};
const ENEMY={red:['ball-red','ball'],purple:['ball-purple','ball'],green:['ball-green','ball'],slick:['slick','eraser'],sam:['sam','eraser'],ugg:['ugg','office'],wrong:['wrongway','office']};
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ',DIRS=['up','down','left','right'];
const KEYS={up:['ArrowUp','w','W'],down:['ArrowDown','s','S'],left:['ArrowLeft','a','A'],right:['ArrowRight','d','D']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: the hop, the colour change, the disc's warble, Coily, the fall, the catch and the round's tune.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('q-nerd',e))return;
  if(e.type==='hop')b.tone(330,.05,.02,'square');
  else if(e.type==='change')b.tone(660,.06,.02,'triangle');
  else if(e.type==='undo')b.tone(240,.08,.02,'triangle');
  else if(e.type==='disc')for(let i=0;i<10;i++)b.tone(500+(i%2)*300+i*40,.08,.02,'sine',i*.18);
  else if(e.type==='enter')b.tone(e.kind==='purple'?180:260,.08,.018,'square');
  else if(e.type==='hatch')for(let i=0;i<4;i++)b.tone(120+i*30,.08,.03,'sawtooth',i*.08);
  else if(e.type==='coily')for(let i=0;i<10;i++)b.tone(900-i*70,.07,.025,'square',i*.07);
  else if(e.type==='jumpoff')for(let i=0;i<12;i++)b.tone(1000-i*70,.07,.02,'sine',i*.08);
  else if(e.type==='catch'||e.type==='freeze')for(let i=0;i<4;i++)b.tone(700+i*200,.06,.03,'square',i*.06);
  // The cabinet's cursing: a burst of gibberish over a thud.
  else if(e.type==='death'){b.noise(.5,500,.06);for(let i=0;i<7;i++)b.tone([620,410,760,330,540,880,450][i],.07,.03,'square',.12+i*.075)}
  else if(e.type==='cleared')for(let i=0;i<8;i++)b.tone([523,659,784,1047][i%4],.09,.03,'square',i*.11);
  else if(e.type==='extra')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09)}
 loop(){}
}

class QnerdGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.tap=null;this.sounds=new Sounds(services);this.puffs=[]}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const k of names)this.tex[k]=await texture(P,art[k]);
  // One scale per family, so both nerd views, all balls and both erasers are the same size.
  this.k={nerd:SIZE.nerd/this.tex['nerd-front'].height,ball:SIZE.ball/this.tex['ball-red'].height,coily:SIZE.coily/this.tex['coily-b'].height,eraser:SIZE.eraser/this.tex.slick.height,office:SIZE.office/this.tex.ugg.height,disc:SIZE.disc/this.tex['disc-a'].width};
  const layer=()=>{const c=new P.Container();app.stage.addChild(c);return c};
  this.backLayer=layer();this.cubeLayer=new P.Graphics();app.stage.addChild(this.cubeLayer);this.discLayer=layer();this.actorLayer=layer();this.fxLayer=layer();
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'});
  this.hud=layer();const text=(size,ax=.5,ay=0)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,ay);this.hud.addChild(t);return t};
  this.goal=new P.Graphics();this.hud.addChild(this.goal);
  this.scoreText=text(52,0);this.livesText=text(22,1);this.bestText=text(22);this.goalText=text(22,0,.5);this.pointsText=text(22);this.message=text(52,.5,.5);this.sub=text(30,.5,.5);
  this.onKey=e=>this.key(e,true);this.offKey=e=>this.key(e,false);addEventListener('keydown',this.onKey);addEventListener('keyup',this.offKey);this.touch=g.No2TouchPad?.(this,app.canvas,W,H)||{fingers:new Map(),stick:()=>({x:0,y:0,d:0}),dir4:()=>null,take:k=>k==='twos'?0:[]};
  this.tracing=await g.No2Tracing?.attach(P,app,this.hud,{quiet:[this.message,this.sub]});this.newGame(this.seed);app.ticker.add(t=>this.frame(t.deltaMS/1000));return this}
 inputEnabled(){return !g.No2||g.No2.gameInputEnabled?.()!==false}
 key(e,down){if(!this.inputEnabled())return;const k=e.key;
  // Initials: letters typed on the keyboard go straight in (owner 2026-10-25), so no letter moves or pauses here.
  if(this.mode==='initials'){if(down){e.preventDefault();if(!e.repeat||k.startsWith('Arrow'))this.edge(k)}return}
  if(down&&(k==='p'||k==='P')){this.pause();e.preventDefault();return}
  // A tap shorter than a frame still hops: it is kept until the nerd takes off.
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){this.held[name]=down;if(down&&!e.repeat)this.tap=this.engine.direction(this.held);e.preventDefault()}
  if(down&&!e.repeat)this.edge(k)}
 edge(k){if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller: the stick (with a dead zone) hops along the diagonal it is pushed to, like the cabinet's turned stick; the D-pad
 // follows the same turn as the arrow keys; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0,dz=v=>Math.abs(v)<.25?0:v;
   now.axis=dz(x);now.axisY=dz(y);now.up=b(12);now.down=b(13);now.left=b(14);now.right=b(15);now.fire=b(0);now.pause=b(9);now.dir=this.engine.direction({axis:now.axis,axisY:now.axisY,up:now.up,down:now.down,left:now.left,right:now.right})}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){const u=now.up||now.axisY<-.5,d=now.down||now.axisY>.5,pu=this.pad.up||this.pad.axisY<-.5,pd=this.pad.down||this.pad.axisY>.5;if(u&&!pu)this.edge('ArrowUp');if(d&&!pd)this.edge('ArrowDown');if(now.fire&&!this.pad.fire)this.edge(' ')}
  else if(now.dir&&now.dir!==this.pad.dir)this.tap=now.dir;
  this.pad=now}
 // Touch: tap beside Q-nerd on the side to hop to (up-right, down-right, down-left, up-left), or swipe that way.
 input(){const T=this.touch,diag=(x,y)=>x>=0?(y<0?'ur':'dr'):(y<0?'ul':'dl'),q=this.engine.qpos();for(const t of T.take('taps'))this.tap=diag(t.x-q.x,t.y-q.y);for(const s of T.take('swipes'))this.tap=diag(s.dx,s.dy);
  const d=this.engine.direction(this.held)||this.pad.dir||this.tap;return d?{dir:d}:{}}
 newGame(seed=this.seed){this.seed=seed;this.endHold=0;this.engine=new Core.QbertEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,Core)||null;this.paused=false;this.puffs=[];this.tap=null;this.cubeKey='';if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   if(this.engine.state!=='play')this.tap=null;// The last life keeps the cursing balloon on screen for a moment before the end screen.
   if(this.engine.state==='end'&&(this.endHold+=dt)>=C.deathPause)this.endGame()}
  for(const f of this.puffs)f.life-=dt;this.puffs=this.puffs.filter(f=>f.life>0);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(ev.type==='hop')this.tap=null;
   if(ev.type==='catch'||ev.type==='freeze'||ev.type==='coily')this.puffs.push({x:ev.x,y:ev.y,life:.8,size:70,k:'burst',text:String(ev.points)});
   // The round bonus sits under the pyramid, clear of the bottom row.
   if(ev.type==='cleared')this.puffs.push({x:W/2,y:H+12,life:2,text:'bonus '+(ev.bonus+ev.discs)});
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 pool(layer,list,n,t){while(list.length<n){const s=new this.P.Sprite(this.tex[t]);s.anchor.set(.5);layer.addChild(s);list.push(s)}list.forEach((s,i)=>s.visible=i<n);return list}
 covers(){return COVERS[(this.engine.rounds-1)%COVERS.length]}
 cover(v){const e=this.engine,c=this.covers();return e.target()===1?(v?c[2]:c[0]):c[v]}
 // One cube is two stacked books: the cover on top takes the colour, the spines face left, the page edges face right.
 drawCubes(){const e=this.engine,key=e.rounds+'|'+e.level+'|'+e.cubes.map(r=>r.join('')).join('/');if(key===this.cubeKey)return;this.cubeKey=key;const b=this.cubeLayer;b.clear();
  for(let r=0;r<C.rows;r++)for(let c=0;c<=r;c++){const {x,y}=Core.top(r,c),L=x-CW/2,R=x+CW/2,hw=CW/2,col=this.cover(e.cubes[r][c]),i=r*8+c,half=SD/2;
   const left=[L,y,x,y+HT,x,y+HT+SD,L,y+SD],right=[x,y+HT,R,y,R,y+SD,x,y+HT+SD];
   b.poly(left).fill(SPINES[i%SPINES.length]);b.poly([L,y+half,x,y+HT+half,x,y+HT+SD,L,y+SD]).fill({color:SPINES[(i*3+2)%SPINES.length]});
   b.poly(right).fill(PAGE);for(let k=1;k<6;k++){const dy=SD*k/6;b.moveTo(x+3,y+HT+dy).lineTo(R-3,y+dy).stroke({width:1,color:0x8a8f9e,alpha:.55})}
   // Book boards: a thin coloured band at the top and middle of the page side, ink lines across the spines.
   b.poly([x,y+HT,R,y,R,y+4,x,y+HT+4]).fill(SPINES[i%SPINES.length]);b.poly([x,y+HT+half-2,R,y+half-2,R,y+half+2,x,y+HT+half+2]).fill(SPINES[(i*3+2)%SPINES.length]);
   b.moveTo(L,y+half).lineTo(x,y+HT+half).stroke({width:1.6,color:INK,alpha:.85});
   for(const f of [.3,.72])b.moveTo(L+hw*.12,y+SD*f+HT*.12).lineTo(x-hw*.12,y+HT+SD*f-HT*.12).stroke({width:1,color:PAGE,alpha:.6});
   b.poly([x,y-HT,R,y,x,y+HT,L,y]).fill(col);
   // Coloured-pencil grain on the cover and a thin frame like a printed hardback.
   for(let k=-3;k<=3;k++)b.moveTo(x+k*12-14,y-HT*.55+Math.abs(k)*2).lineTo(x+k*12+14,y+HT*.55-Math.abs(k)*2).stroke({width:1.2,color:0xffffff,alpha:.13});
   b.poly([x,y-HT*.7,x+hw*.7,y,x,y+HT*.7,x-hw*.7,y]).stroke({width:1.2,color:INK,alpha:.35});
   b.poly([x,y-HT,R,y,R,y+SD,x,y+HT+SD,L,y+SD,L,y]).stroke({width:2.2,color:INK,alpha:.95,join:'round'});b.moveTo(L,y).lineTo(x,y+HT).lineTo(R,y).moveTo(x,y+HT).lineTo(x,y+HT+SD).stroke({width:2,color:INK,alpha:.95})}}
 place(s,k,x,y,scale,flip=1,ay=1,rot=0,alpha=1){const T=this.tex;if(s.texture!==T[k])s.texture=T[k];s.anchor.set(.5,ay);s.position.set(x,y);s.scale.set(scale*flip,scale);s.rotation=rot;s.alpha=alpha;s.visible=true}
 render(){const e=this.engine,q=e.q,blink=Math.floor(e.clock*6)%2;this.drawCubes();
  // Frisbees spin beside the pyramid where a hop off the edge lands.
  const discs=e.discs.filter(d=>!(q.disc===d&&q.state==='land')),ds=this.pool(this.discLayer,this.discSprites??=[],discs.length,'disc-a');
  discs.forEach((d,i)=>{const p=q.disc===d&&q.state==='disc'?e.qpos():Core.spot(d.r,d.c);this.place(ds[i],Math.floor(e.clock*5+i)%2?'disc-a':'disc-b',p.x,p.y+C.body+(q.disc===d?6:Math.sin(e.clock*3+i)*3),this.k.disc,1,.5)});
  // Actors: the nerd and every enemy, with feet on the cube top; those falling behind the pyramid are drawn under the books.
  const actors=[],ended=this.mode==='initials'||this.mode==='over';
  for(const o of ended?[]:e.enemies){const p=e.pos(o);let [k,fam]=o.kind==='coily'?[o.phase==='hop'?'coily-b':'coily-a','coily']:ENEMY[o.kind],flip=1,rot=0,ay=1,y=p.y+C.body;
   if(o.kind==='coily'){const a=o.from||Core.spot(o.r,o.c),f=this.faces??=new WeakMap();if(o.phase==='hop'&&a.x!==Core.spot(o.r,o.c).x)f.set(o,Core.spot(o.r,o.c).x<a.x);flip=f.get(o)?-1:1}
   else if(o.kind==='ugg'||o.kind==='wrong'){rot=o.kind==='ugg'?Math.PI/2:-Math.PI/2;ay=.5;y=p.y;flip=o.kind==='ugg'?1:-1}
   else if(fam==='eraser')flip=o.c*2<o.r?1:-1;
   actors.push({k,scale:this.k[fam],x:p.x+(o.kind==='ugg'?-8:o.kind==='wrong'?8:0),y,flip,rot,ay,behind:o.behind&&o.phase==='fall',alpha:e.freeze>0?(blink?.55:.8):1,z:p.y})}
  if(!ended){const p=e.qpos(),back=q.dir==='ur'||q.dir==='ul',air=q.state==='hop'||q.state==='fall'||q.state==='land',k=(back?'nerd-back':'nerd-front')+(air?'-hop':''),flip=q.dir==='dl'||q.dir==='ul'?-1:1;
   actors.push({k,scale:this.k.nerd,x:p.x,y:p.y+C.body+4,flip,rot:0,ay:1,behind:q.state==='fall'&&q.behind,alpha:1,z:p.y+1})}
  actors.sort((a,b)=>a.z-b.z);const back=actors.filter(a=>a.behind),front=actors.filter(a=>!a.behind);
  const bs=this.pool(this.backLayer,this.backSprites??=[],back.length,'dust'),fs=this.pool(this.actorLayer,this.actorSprites??=[],front.length,'dust');
  back.forEach((a,i)=>this.place(bs[i],a.k,a.x,a.y,a.scale,a.flip,a.ay,a.rot,a.alpha));front.forEach((a,i)=>this.place(fs[i],a.k,a.x,a.y,a.scale,a.flip,a.ay,a.rot,a.alpha));
  // The cabinet's cursing balloon when he is caught.
  const fx=[...this.puffs.filter(f=>f.k)];if(!ended&&(e.state==='dead'||e.state==='end')&&q.state!=='fall'){const p=e.qpos();fx.push({k:'curse',x:p.x+52,y:p.y-62,size:96,life:1})}
  const ps=this.pool(this.fxLayer,this.fxSprites??=[],fx.length,'burst');fx.forEach((f,i)=>{this.place(ps[i],f.k,f.x,f.y,f.size/this.tex[f.k].width,1,.5,0,Math.min(1,f.life*4))});
  const hitText=this.puffs.find(f=>f.text);this.pointsText.text=hitText?hitText.text:'';if(hitText)this.pointsText.position.set(hitText.x,hitText.y-50);
  this.scoreText.text=String(e.score).padStart(6,'0');this.livesText.text='lives '+Math.max(0,e.lives)+'   level '+e.level+'   round '+e.round;
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  // Change to: the round's target cover, as on the cabinet's side panel.
  this.goalText.text='change to';const gc=this.cover(e.target());if(this.goalKey!==gc){this.goalKey=gc;const G=this.goal,s=.42;G.clear().poly([0,-HT*s,CW/2*s,0,0,HT*s,-CW/2*s,0]).fill(gc).stroke({width:2,color:INK})}
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='final grade.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  else if(e.state==='cleared'){msg=e.round===C.roundsPerLevel?'next level.':'chapter done.'}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.livesText,this.bestText,this.pointsText,this.goalText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  // A paper-coloured edge keeps messages and points readable over the busy play field.
  for(const t of [this.message,this.sub,this.pointsText])t.style.stroke={color:0xf7f0e2,width:Math.max(3,Math.round(t.style.fontSize*.16)),join:'round'};
  this.scoreText.position.set(24,4);this.livesText.position.set(W-24,14);this.bestText.position.set(W/2,14);
  const gy=4+px(52)*1.35;this.goalText.position.set(24,gy);this.goal.position.set(24+this.goalText.width+34,gy);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.livesText,this.bestText,this.goalText,this.pointsText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class QnerdAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1981){if(this.api)return this.api;const frame=document.createElement('div');frame.id='q-nerd-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new QnerdGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>QnerdTests.run(QnerdCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.tap=null;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2Qnerd={Adapter:QnerdAdapter,Game:QnerdGame,art};
})(globalThis);
