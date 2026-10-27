'use strict';
// Centigrade play page: runs CentigradeCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over her college-ruled paper: a centipede of grade letters, pink erasers for mushrooms (red-penned
// when poisoned), the drafting compass spider, the pushpin flea, the red pen scorpion and her pencil (centigrade-sprites).
(function(g){
const ID='centigrade',C=CentigradeCore.CONFIG,W=C.width,H=C.height,INK=0x22355a;
const names=['head-a','head-b','seg-b','seg-c','seg-d','seg-f','eraser-0','eraser-1','eraser-2','eraser-3','marked-0','marked-1','marked-2','marked-3','compass-a','compass-b','pen','pin','pencil','crumbs'];
const art={"head-a":"@@asset:assets/centigrade/head-a.webp@@","head-b":"@@asset:assets/centigrade/head-b.webp@@","seg-b":"@@asset:assets/centigrade/seg-b.webp@@","seg-c":"@@asset:assets/centigrade/seg-c.webp@@","seg-d":"@@asset:assets/centigrade/seg-d.webp@@","seg-f":"@@asset:assets/centigrade/seg-f.webp@@","eraser-0":"@@asset:assets/centigrade/eraser-0.webp@@","eraser-1":"@@asset:assets/centigrade/eraser-1.webp@@","eraser-2":"@@asset:assets/centigrade/eraser-2.webp@@","eraser-3":"@@asset:assets/centigrade/eraser-3.webp@@","marked-0":"@@asset:assets/centigrade/marked-0.webp@@","marked-1":"@@asset:assets/centigrade/marked-1.webp@@","marked-2":"@@asset:assets/centigrade/marked-2.webp@@","marked-3":"@@asset:assets/centigrade/marked-3.webp@@","compass-a":"@@asset:assets/centigrade/compass-a.webp@@","compass-b":"@@asset:assets/centigrade/compass-b.webp@@",pen:"@@asset:assets/centigrade/pen.webp@@",pin:"@@asset:assets/centigrade/pin.webp@@",pencil:"@@asset:assets/centigrade/pencil.webp@@",crumbs:"@@asset:assets/centigrade/crumbs.webp@@"};
const BODY=['seg-b','seg-c','seg-d','seg-f'],LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],up:['ArrowUp','w','W'],down:['ArrowDown','s','S'],fire:[' ']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: the centipede's patter, the shot, hits, the spider's warble, the flea's fall and the scorpion.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.beat=0;this.flip=false}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('centigrade',e))return;
  if(e.type==='shot')b.tone(1800,.03,.018,'square');
  else if(e.type==='kill')b.noise(.1,1400,.05);
  else if(e.type==='mushroom')b.tone(300,.05,.02,'triangle');
  else if(e.type==='spider'||e.type==='flea'||e.type==='scorpion')for(let i=0;i<3;i++)b.tone(900+i*300,.06,.03,'square',i*.06);
  else if(e.type==='fleaIn')for(let i=0;i<8;i++)b.tone(1600-i*140,.05,.015,'sine',i*.05);
  else if(e.type==='death')b.noise(.9,300,.09);
  else if(e.type==='restore')for(let i=0;i<Math.min(e.count,12);i++)b.tone(500+i*40,.04,.02,'square',i*.07);
  else if(e.type==='extra')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09)}
 loop(engine,dt){if(!this.on()||engine.state!=='play')return;this.beat-=dt;if(this.beat<=0){this.beat=.16;this.flip=!this.flip;this.bus.gameTone('centigrade','beat-voice',this.flip?180:150,.08,.012,'triangle');
   if(engine.spider&&this.flip)this.bus.gameTone('centigrade','spider-voice',700+Math.sin(engine.clock*9)*200,.12,.012,'sine');if(engine.scorpion&&!this.flip)this.bus.gameTone('centigrade','scorpion-voice',240,.12,.014,'sawtooth')}}
}

class CentigradeGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.sounds=new Sounds(services);this.puffs=[]}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const k of names)this.tex[k]=await texture(P,art[k]);
  // One scale per family, so worn erasers shrink and every segment is the same size.
  this.k={eraser:C.cell*.95/this.tex['eraser-0'].width,seg:C.cell*1.12/this.tex['seg-b'].width};
  const layer=()=>{const c=new P.Container();app.stage.addChild(c);return c};
  this.mushLayer=layer();this.critterLayer=layer();this.segLayer=layer();this.fxLayer=layer();
  // Like the cabinet's screen edge: critters and side heads coming in show only once they are on the field.
  for(const l of [this.critterLayer,this.segLayer]){const m=new P.Graphics().rect(C.left,0,C.cols*C.cell,H).fill(0xffffff);app.stage.addChild(m);l.mask=m}
  const sprite=(t,ax=.5,ay=.5)=>{const s=new P.Sprite(this.tex[t]);s.anchor.set(ax,ay);app.stage.addChild(s);return s};
  this.player=sprite('pencil',.5,.3);this.player.scale.set(C.cell*1.5/this.player.texture.height);
  this.shot=new P.Graphics().circle(0,0,3.2).fill(INK).rect(-1.2,0,2.4,12).fill(INK);app.stage.addChild(this.shot);
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'});
  this.hud=layer();const text=(size,ax=.5,ay=0)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,ay);this.hud.addChild(t);return t};
  this.scoreText=text(52,0);this.livesText=text(22,1);this.bestText=text(22);this.pointsText=text(22);this.message=text(52,.5,.5);this.sub=text(30,.5,.5);
  this.onKey=e=>this.key(e,true);this.offKey=e=>this.key(e,false);addEventListener('keydown',this.onKey);addEventListener('keyup',this.offKey);this.touch=g.No2TouchPad?.(this,app.canvas,W,H)||{fingers:new Map(),stick:()=>({x:0,y:0,d:0}),dir4:()=>null,take:k=>k==='twos'?0:[]};this.onBlur=()=>{this.held={}};addEventListener('blur',this.onBlur);
  this.tracing=await g.No2Tracing?.attach(P,app,this.hud,{quiet:[this.message,this.sub]});this.newGame(this.seed);app.ticker.add(t=>this.frame(t.deltaMS/1000));return this}
 inputEnabled(){return !g.No2||g.No2.gameInputEnabled?.()!==false}
 key(e,down){if(!this.inputEnabled()){if(!down)this.held={};return}const k=e.key;
  // Initials: letters typed on the keyboard go straight in (owner 2026-10-25), so no letter moves or pauses here.
  if(this.mode==='initials'){if(down){e.preventDefault();if(!e.repeat||k.startsWith('Arrow'))this.edge(k)}return}
  if(down&&(k==='p'||k==='P')){this.pause();e.preventDefault();return}
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){this.held[name]=down;if(down&&name==='fire')this.tap=true;e.preventDefault()}
  if(down&&!e.repeat)this.edge(k)}
 // For a moment after the game ends a button still being mashed neither types initials nor restarts.
 edge(k){if(this.endHold>0)return;if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller: stick (analog, with a dead zone) or D-pad moves in both directions; A fires; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0,dz=v=>Math.abs(v)<.2?0:Math.sign(v)*Math.min(1,(Math.abs(v)-.2)/.7);
   now.axis=dz(x);now.axisY=dz(y);now.left=b(14);now.right=b(15);now.up=b(12)||y<-.5;now.down=b(13)||y>.5;now.dup=b(12);now.ddown=b(13);now.fire=b(0);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.fire&&!this.pad.fire)this.edge(' ')}
  this.pad=now}
 // Fire counts only once it has been let go since play resumed, so the A that starts the page does not shoot.
 // Touch: the pencil follows a dragged finger like the cabinet's trackball, at up to three times the stick speed so it keeps up
 // with the finger (owner 2026-10-30), firing while the finger is down. A key tap shorter than a frame still counts once (latched on keydown).
 input(){const pad=this.pad,h=this.held,f=this.touch.stick().f,fire=!!(h.fire||pad.fire||f||this.tap);this.tap=false;if(!fire)this.fireArmed=true;let tx=0,ty=0;
  if(f){const p=this.engine.player,g=this.grip?.f===f?this.grip:this.grip={f,x:p.x,y:p.y},v=d=>Math.abs(d)>1?Math.max(-3,Math.min(3,d/6)):0;tx=v(g.x+(f.x-f.x0)*1.4-p.x);ty=v(g.y+(f.y-f.y0)*1.4-p.y)}
  const kx=(h.right||pad.right?1:0)-(h.left||pad.left?1:0),ky=(h.down||pad.ddown?1:0)-(h.up||pad.dup?1:0);return{axis:kx||pad.axis||tx,axisY:ky||pad.axisY||ty,fire:fire&&this.fireArmed}}
 newGame(seed=this.seed){this.seed=seed;this.engine=new CentigradeCore.CentipedeEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,CentigradeCore)||null;this.paused=false;this.puffs=[];if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);if(this.endHold>0)this.endHold-=dt;this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);if(this.engine.state==='end')this.endGame()}
  for(const f of this.puffs)f.life-=dt;this.puffs=this.puffs.filter(f=>f.life>0);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(['kill','spider','flea','scorpion','mushroom'].includes(ev.type))this.puffs.push({x:ev.x,y:ev.y,life:ev.type==='mushroom'?.25:.4,size:ev.type==='kill'||ev.type==='mushroom'?40:64,text:ev.type!=='kill'&&ev.points?String(ev.points):''});
   if(ev.type==='death')this.puffs.push({x:ev.x,y:ev.y,life:1.2,size:96});
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}this.endHold=.9;const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 pool(layer,list,n,t){while(list.length<n){const s=new this.P.Sprite(this.tex[t]);s.anchor.set(.5);layer.addChild(s);list.push(s)}list.forEach((s,i)=>s.visible=i<n);return list}
 render(){const e=this.engine,T=this.tex,step=Math.floor(e.clock*8)%2;
  // Erasers wear down with each hit; poisoned ones carry the red pen's marks.
  const ms=[];e.grid.forEach((row,r)=>row.forEach((m,c)=>{if(m)ms.push([c,r,m])}));const mp=this.pool(this.mushLayer,this.mushSprites??=[],ms.length,'eraser-0');
  ms.forEach(([c,r,m],i)=>{const s=mp[i],k=(m.poison?'marked-':'eraser-')+(C.mushroomHits-m.hp);if(s.texture!==T[k])s.texture=T[k];s.scale.set(this.k.eraser);s.position.set(CentigradeCore.cx(c),CentigradeCore.cy(r))});
  // Segments: the head walks on two leg steps and faces the way it goes; the body letters run B, C, D, F behind it.
  const segs=e.chains.flatMap(ch=>ch.segs.map((s,i)=>[s,i,ch])).filter(([s])=>s.r>=0);const sp=this.pool(this.segLayer,this.segSprites??=[],segs.length,'seg-b');
  segs.forEach(([s,i,ch],j)=>{const o=sp[j],k=i===0?(step?'head-b':'head-a'):BODY[(i-1)%BODY.length];if(o.texture!==T[k])o.texture=T[k];const p=e.pos(s);
   o.anchor.set(.5,i===0?.6:.5);o.scale.set(this.k.seg*(i===0&&s.dir<0?-1:1),this.k.seg);o.rotation=i?Math.sin(e.clock*14+s.id)*.12:0;o.position.set(p.x,p.y)});
  const cr=[];if(e.spider)cr.push([e.spider,step?'compass-a':'compass-b',C.cell*1.9,'h',0]);if(e.flea)cr.push([e.flea,'pin',C.cell*1.4,'h',0]);if(e.scorpion)cr.push([e.scorpion,'pen',C.cell*2.2,'w',e.scorpion.vx]);
  const cp=this.pool(this.critterLayer,this.critterSprites??=[],cr.length,'pin');
  cr.forEach(([o,k,size,dim,vx],i)=>{const s=cp[i];if(s.texture!==T[k])s.texture=T[k];const sc=size/s.texture[dim==='h'?'height':'width'];
   // The red pen is drawn tilted; it is turned level and points the way it crawls.
   if(k==='pen'){s.rotation=vx<0?.72:-.72;s.scale.set(vx<0?sc:-sc,sc)}else{s.rotation=0;s.scale.set(sc)}s.position.set(o.x,o.y)});
  const puffs=this.pool(this.fxLayer,this.puffSprites??=[],this.puffs.length,'crumbs');this.puffs.forEach((f,i)=>{const s=puffs[i];s.position.set(f.x,f.y);s.scale.set(f.size/s.texture.width);s.alpha=Math.min(1,f.life*4)});
  const p=e.player;this.player.visible=e.state!=='dead'||Math.floor(e.clock*10)%2===0;this.player.position.set(p.x,p.y-C.cell*.25);
  this.shot.visible=!!e.shot;if(e.shot)this.shot.position.set(e.shot.x,e.shot.y);
  const hitText=this.puffs.find(f=>f.text);this.pointsText.text=hitText?hitText.text:'';if(hitText)this.pointsText.position.set(hitText.x,hitText.y-44);
  this.scoreText.text=String(e.score).padStart(4,'0');this.livesText.text='lives '+Math.max(0,e.lives)+'   wave '+e.wave;
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='final grade.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  else if(e.state==='cleared'){msg='next semester.'}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.livesText,this.bestText,this.pointsText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  this.scoreText.position.set(C.left,4);this.livesText.position.set(W-C.left,14);this.bestText.position.set(W/2,14);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.livesText,this.bestText,this.pointsText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class CentigradeAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1981){if(this.api)return this.api;const frame=document.createElement('div');frame.id='centigrade-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new CentigradeGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>CentigradeTests.run(CentigradeCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.held={};this.game.fireArmed=false;this.game.tap=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);removeEventListener('blur',game.onBlur);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2Centigrade={Adapter:CentigradeAdapter,Game:CentigradeGame,art};
})(globalThis);
