'use strict';
// Galgebra play page: runs GalgebraCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over her graph paper: whole equations in formation, harder each wave, each enemy one piece that dives as itself,
// her blue rocket firing plus signs, minus signs falling back (galgebra-sprites).
(function(g){
const ID='galgebra',C=GalgebraCore.CONFIG,W=C.width,H=C.height,INK=0x22355a;
const art={"g:0":"@@asset:assets/galgebra/g-0.webp@@","g:1":"@@asset:assets/galgebra/g-1.webp@@","g:2":"@@asset:assets/galgebra/g-2.webp@@","g:3":"@@asset:assets/galgebra/g-3.webp@@","g:4":"@@asset:assets/galgebra/g-4.webp@@","g:5":"@@asset:assets/galgebra/g-5.webp@@","g:6":"@@asset:assets/galgebra/g-6.webp@@","g:7":"@@asset:assets/galgebra/g-7.webp@@","g:8":"@@asset:assets/galgebra/g-8.webp@@","g:9":"@@asset:assets/galgebra/g-9.webp@@","g:a":"@@asset:assets/galgebra/g-a.webp@@","g:b":"@@asset:assets/galgebra/g-b.webp@@","g:c":"@@asset:assets/galgebra/g-c.webp@@","g:h":"@@asset:assets/galgebra/g-h.webp@@","g:k":"@@asset:assets/galgebra/g-k.webp@@","g:m":"@@asset:assets/galgebra/g-m.webp@@","g:x":"@@asset:assets/galgebra/g-x.webp@@","g:y":"@@asset:assets/galgebra/g-y.webp@@","g:cap-A":"@@asset:assets/galgebra/g-cap-A.webp@@","g:cap-B":"@@asset:assets/galgebra/g-cap-B.webp@@","g:cap-C":"@@asset:assets/galgebra/g-cap-C.webp@@","g:plus":"@@asset:assets/galgebra/g-plus.webp@@","g:minus":"@@asset:assets/galgebra/g-minus.webp@@","g:eq":"@@asset:assets/galgebra/g-eq.webp@@","g:pm":"@@asset:assets/galgebra/g-pm.webp@@","g:sqrt":"@@asset:assets/galgebra/g-sqrt.webp@@","g:lp":"@@asset:assets/galgebra/g-lp.webp@@","g:rp":"@@asset:assets/galgebra/g-rp.webp@@","g:slash":"@@asset:assets/galgebra/g-slash.webp@@","g:sup2":"@@asset:assets/galgebra/g-sup2.webp@@","g:sub1":"@@asset:assets/galgebra/g-sub1.webp@@","g:sub2":"@@asset:assets/galgebra/g-sub2.webp@@","g:ant":"@@asset:assets/galgebra/g-ant.webp@@","g:crown":"@@asset:assets/galgebra/g-crown.webp@@","g:delta":"@@asset:assets/galgebra/g-delta.webp@@",bug1a:"@@asset:assets/galgebra/bug1a.webp@@",bug1b:"@@asset:assets/galgebra/bug1b.webp@@",bug2a:"@@asset:assets/galgebra/bug2a.webp@@",bug2b:"@@asset:assets/galgebra/bug2b.webp@@",bug3a:"@@asset:assets/galgebra/bug3a.webp@@",bug3b:"@@asset:assets/galgebra/bug3b.webp@@",flag:"@@asset:assets/galgebra/flag.webp@@",ship:"@@asset:assets/galgebra/ship.webp@@","ship-rule":"@@asset:assets/galgebra/ship-rule.webp@@","ship-keys":"@@asset:assets/galgebra/ship-keys.webp@@",plus:"@@asset:assets/galgebra/plus.webp@@",minus:"@@asset:assets/galgebra/minus.webp@@",boom:"@@asset:assets/galgebra/boom.webp@@",puff:"@@asset:assets/galgebra/puff.webp@@"};
const TEX={blue:'bug1',purple:'bug2',red:'bug3'},SIZE={blue:44,purple:44,red:44,flag:60};
// Maths in formation (owner 2026-10-28): the rows spell ax² + bx + c = 0 (flagships, red, purple, blue); a diver breaks off as a single variable.
// Maths in formation (owner 2026-10-28): each row holds whole equations, one piece per enemy, harder by wave; a diver flies
// down as its piece and leaves a gap in the line. Pieces are her pencil glyphs, inked in the row's colour.
const EQ=[['y=mx+b','Ax+By=C'],['y−y₁=m(x−x₁)','m=(y₂−y₁)/(x₂−x₁)'],['ax²+bx+c=0','y=a(x−h)²+k'],['x=(−b±√(b²−4ac))/2a','x=−b/2a']];
const GLYPH={'+':'plus','−':'minus','=':'eq','±':'pm','√':'sqrt','(':'lp',')':'rp','/':'slash','²':'sup2','₁':'sub1','₂':'sub2','Δ':'delta',A:'cap-A',B:'cap-B',C:'cap-C'};
const INKS={flag:0x2f5fc8,red:0xc8303f,purple:0x7a46b8,blue:0x2f5fc8},CROWN=0xc8303f,GH=160,GK=.37,CELL=56;
const glyphs=e=>[...e].map(c=>GLYPH[c]||c);
// An equation's natural pieces break before each + − = ± /, except right after an opening bracket or an equals sign.
function atoms(e){const g=glyphs(e),out=[];for(let i=0;i<g.length;i++){const brk=i>0&&['plus','minus','eq','pm','slash'].includes(g[i])&&!['lp','eq'].includes(g[i-1]);if(!out.length||brk)out.push([]);out[out.length-1].push(g[i])}return out}
// Exactly k pieces: split the longest piece in half, or join the shortest neighbouring pair.
function pieces(e,k){const p=atoms(e);while(p.length<k){let i=0;p.forEach((q,j)=>{if(q.length>p[i].length)i=j});if(p[i].length<2)break;const h=p[i].length>>1;p.splice(i,1,p[i].slice(0,h),p[i].slice(h))}
 while(p.length>k){let i=0,best=1e9;for(let j=0;j<p.length-1;j++)if(p[j].length+p[j+1].length<best){best=p[j].length+p[j+1].length;i=j}p.splice(i,2,p[i].concat(p[i+1]))}return p}
// A row of n enemies: as many of the wave's equations as fit, each whole and in order, no piece longer than three glyphs
// (an equation too long for the room left gives way to a shorter one).
const want=e=>Math.max(atoms(e).length,Math.ceil(glyphs(e).length/3));
function rowPieces(n,pool,start){const out=[],least=Math.min(...pool.map(want));let i=start,left=n;
 while(left>0){let e=null;for(let t=0;t<pool.length&&!e;t++){const c=pool[(i+t)%pool.length];if(want(c)<=left){e=c;i+=t}}e??=pool[i%pool.length];i++;
  const k=left-want(e)>=least?want(e):Math.min(left,glyphs(e).length);out.push(...pieces(e,k));left-=k}return out.slice(0,n)}
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],fire:[' ']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: the swarm's hum, the whistle of a dive, the missile, a hit, and the player's loss.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.hum=0;this.flip=false}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('galgebra',e.type==='power'?{type:'extra'}:e))return;// powering up rings the extra-ship chime
  if(e.type==='dive')for(let i=0;i<6;i++)b.tone(1400-i*150,.08,.018,'sine',i*.07);
  else if(e.type==='shot')b.tone(1600,.07,.025,'square');
  else if(e.type==='kill'){b.noise(.16,1100,.06);if(e.kind==='flag')for(let i=0;i<3;i++)b.tone(660+i*220,.08,.03,'square',.05+i*.07)}
  else if(e.type==='death'||e.type==='crash')b.noise(.8,380,.09);
  else if(e.type==='extra')for(let i=0;i<5;i++)b.tone(1320,.05,.035,'square',i*.09)}
 loop(engine,dt){if(!this.on()||engine.state!=='play')return;this.hum-=dt;if(this.hum<=0){this.hum=.18;this.flip=!this.flip;this.bus.gameTone('galgebra','hum-voice',this.flip?110:123,.16,.012,'triangle')}}
}

class GalgebraGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.sounds=new Sounds(services);this.puffs=[]}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const [k,v] of Object.entries(art))this.tex[k]=await texture(P,v);
  const layer=()=>{const c=new P.Container();app.stage.addChild(c);return c};
  this.alienLayer=layer();this.fxLayer=layer();this.bulletLayer=layer();
  const sprite=(t,ax=.5,ay=.5)=>{const s=new P.Sprite(this.tex[t]);s.anchor.set(ax,ay);app.stage.addChild(s);return s};
  this.player=sprite('ship');this.player.scale.set(C.playerH*1.5/this.player.texture.height);
  this.shot=sprite('plus');this.shot.scale.set(28/this.shot.texture.height);this.extraShots=[1,2].map(()=>{const s=sprite('plus');s.scale.copyFrom(this.shot.scale);s.visible=false;return s});
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
 // For a moment after the game ends a fire button still being mashed neither types initials nor restarts.
 edge(k){if(this.endHold>0)return;if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller: stick (analog, with a dead zone) or D-pad moves; A fires; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0;
   now.axis=Math.abs(x)<.2?0:Math.sign(x)*Math.min(1,(Math.abs(x)-.2)/.7);now.left=b(14);now.right=b(15);now.up=b(12)||y<-.5;now.down=b(13)||y>.5;now.fire=b(0);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.fire&&!this.pad.fire)this.edge(' ')}
  this.pad=now}
 // Fire counts only once it has been let go since play resumed, so the A that starts the page does not shoot.
 // Touch: the ship slides under a dragged finger; every press fires. A key tap shorter than a frame still counts once (latched on keydown).
 input(){const pad=this.pad,h=this.held,f=this.touch.stick().f,d=f?f.x-this.engine.player.x:0,fire=!!(h.fire||pad.fire||this.tap);this.tap=false;if(!fire)this.fireArmed=true;const keys=(h.right||pad.right?1:0)-(h.left||pad.left?1:0);
  return{axis:keys||pad.axis||(Math.abs(d)>1.5?Math.max(-1,Math.min(1,d/3)):0),fire:fire&&this.fireArmed||this.touch.take('presses').length>0}}
 newGame(seed=this.seed){this.seed=seed;this.engine=new GalgebraCore.GalaxianEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,GalgebraCore)||null;this.paused=false;this.puffs=[];this.last={};if(this.mode!=='demo')this.mode='play';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused}
 frame(dt){dt=Math.min(dt,.1);if(this.endHold>0)this.endHold-=dt;this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);if(this.engine.state==='end')this.endGame()}
  for(const f of this.puffs)f.life-=dt;this.puffs=this.puffs.filter(f=>f.life>0);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(ev.type==='kill')this.puffs.push({x:ev.x,y:ev.y,life:.35,size:ev.kind==='flag'?90:66,t:'boom',text:ev.diving&&ev.points>=150?String(ev.points):''});
   if(ev.type==='crash')this.puffs.push({x:ev.x,y:ev.y,life:.6,size:80,t:'boom'});
   if(ev.type==='death')this.puffs.push({x:ev.x,y:C.playerY,life:1.2,size:110,t:'boom'});
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}this.endHold=.9;const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 pool(layer,list,n,t){while(list.length<n){const s=new this.P.Sprite(this.tex[t]);s.anchor.set(.5);layer.addChild(s);list.push(s)}list.forEach((s,i)=>s.visible=i<n);return list}
 render(){const e=this.engine,T=this.tex,flap=Math.floor(e.clock*3)%2;
  // Each wave lays its equations along the rows; a piece keeps its place in the line and dives as itself.
  if(this.eqWave!==e.wave){this.eqWave=e.wave;const pool=EQ[Math.min(EQ.length-1,e.wave-1)];this.piece={};
   C.types.forEach((type,row)=>{const cols=C.layout[row]||[...Array(C.cols).keys()],ps=type==='flag'?[['pm'],['sqrt']]:rowPieces(cols.length,pool,row);
    for(const a of e.aliens)if(a.row===row)this.piece[a.id]=type==='flag'?[a.col<5?'pm':'sqrt']:ps[cols.indexOf(a.col)]||['x']})}// flagships that got away come back beside the others, as ± and √ too
  const live=e.alive(),al=this.aliens??=[];while(al.length<live.length){const c=new this.P.Container();this.alienLayer.addChild(c);al.push(c)}al.forEach((c,i)=>c.visible=i<live.length);
  live.forEach((a,i)=>{const c=al[i],form=a.state==='form',p=this.piece[a.id]||['x'],key=a.type+':'+p.join(' ');
   if(c.key!==key){c.key=key;c.removeChildren().forEach(k=>k.destroy());let x=0;const ink=INKS[a.type];
    for(const n of p){const s=new this.P.Sprite(T['g:'+n]);s.tint=ink;s.position.set(x,0);c.addChild(s);x+=s.width*.86}
    const top=new this.P.Sprite(T[a.type==='flag'?'g:crown':'g:ant']);top.tint=a.type==='flag'?CROWN:ink;top.anchor.set(.5,0);top.position.set(x/2,-GH*(a.type==='flag'?.28:.36));c.addChild(top);
    c.pivot.set(x/2,GH*.47);c.span=x;c.base=Math.min(GK*(a.type==='flag'?1.7:1),CELL*(a.type==='flag'?1.6:1)/(x*1)||GK)}
   c.scale.set(c.base);c.position.set(a.x,a.y+(form&&flap?-1.5:0));
   const prev=this.last[a.id];let rot=form?(flap?.04:-.04):0;if(!form&&prev)rot=Math.max(-.45,Math.min(.45,(a.x-prev.x)*.12));
   c.rotation+=(rot-c.rotation)*.25;this.last[a.id]={x:a.x,y:a.y}});
  const bl=this.pool(this.bulletLayer,this.bulletSprites??=[],e.bullets.length,'minus');e.bullets.forEach((b,i)=>{const s=bl[i];s.scale.set(26/s.texture.width);s.anchor?.set(.5);s.rotation=Math.PI/2;s.position.set(b.x,b.y)});// the minus signs fall upright, along their flight (owner 2026-10-28)
  const puffs=this.pool(this.fxLayer,this.puffSprites??=[],this.puffs.length,'boom');this.puffs.forEach((f,i)=>{const s=puffs[i];s.texture=T[f.t];s.position.set(f.x,f.y);s.scale.set(f.size/s.texture.width);s.alpha=Math.min(1,f.life*4)});
  const p=e.player;this.player.visible=e.state!=='end'&&(e.state!=='dead'||Math.floor(e.clock*10)%2===0);this.player.position.set(p.x,C.playerY);
  // Like the cabinet, the next missile waits on the rocket's nose until it is fired.
  // Power: calculator, slide rule, keyboard; every shot of the volley is a plus sign (one rests on the ship when ready).
  const ship=['ship','ship-rule','ship-keys'][e.power||0];if(this.player.texture!==T[ship]){this.player.texture=T[ship];this.player.scale.set(ship==='ship'?C.playerH*1.5/T[ship].height:C.playerW*1.35/T[ship].width)}
  const parts=e.shot?e.shot.parts.filter(q=>!q.dead):[];this.shot.visible=e.shot?parts.length>0:this.player.visible&&e.state==='play';if(e.shot&&parts[0])this.shot.position.set(parts[0].x,parts[0].y);else this.shot.position.set(p.x,C.playerY-C.playerH*.75);
  this.extraShots.forEach((s,i)=>{const q=parts[i+1];s.visible=!!q;if(q)s.position.set(q.x,q.y)});
  const hitText=this.puffs.find(f=>f.text);this.pointsText.text=hitText?hitText.text:'';if(hitText)this.pointsText.position.set(hitText.x,hitText.y-50);
  this.scoreText.text=String(e.score).padStart(4,'0');this.livesText.text='lives '+Math.max(0,e.lives)+'   wave '+e.wave;
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode==='play'?e.score:0):'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='pencils down.';sub=pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again'}
  else if(e.state==='cleared'){msg='next equation.'}
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;this.typeScale()}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.livesText,this.bestText,this.pointsText])t.style.fontSize=px(22);this.sub.style.fontSize=px(30);
  this.scoreText.position.set(C.edge,14);this.livesText.position.set(W-C.edge,22);this.bestText.position.set(W/2,22);
  this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.livesText,this.bestText,this.pointsText,this.message,this.sub].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class GalgebraAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1979){if(this.api)return this.api;const frame=document.createElement('div');frame.id='galgebra-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new GalgebraGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>GalgebraTests.run(GalgebraCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.fireArmed=false;this.game.tap=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);removeEventListener('blur',game.onBlur);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2Galgebra={Adapter:GalgebraAdapter,Game:GalgebraGame,art};
})(globalThis);
