'use strict';
// Locker Gauntlet play page: runs GauntletCore at a fixed 120 Hz and draws it with PixiJS straight onto the host page
// (no iframe), over her graph paper: the locker hallways scroll with the jock in his letterman jacket, hall pass ghosts,
// hall monitors, dodgeball kids, paper wad lobbers, the vanishing substitute and the principal, brick offices for the
// generators, gates, stairwell exits, lunch bags, bells, lunch money and keys (locker-gauntlet-sprites, -tiles).
(function(g){
const ID='locker-gauntlet',C=GauntletCore.CONFIG,W=C.width,H=C.height,T=C.tile,INK=0x22355a;
const names=["hero-down-a", "hero-down-b", "hero-up-a", "hero-up-b", "hero-side-a", "hero-side-b", "ghost-a", "ghost-b", "grunt-a", "grunt-b", "demon-a", "demon-b", "lobber-a", "lobber-b", "sorcerer-a", "death-a", "death-b", "wall", "door", "exit", "exit-lit", "office-1", "office-2", "office-3", "lunch", "bell", "money", "key", "baseball", "dodgeball", "wad", "poof",'valk-down-a','valk-down-b','valk-up-a','valk-up-b','valk-side-a','valk-side-b','valk-item','wiz-down-a','wiz-down-b','wiz-up-a','wiz-up-b','wiz-side-a','wiz-side-b','wiz-item','elf-down-a','elf-down-b','elf-up-a','elf-up-b','elf-side-a','elf-side-b','elf-item','wall-1','wall-2','wall-3','wall-4','wall-5','wall-6','wall-7'];
const art={"hero-down-a":"@@asset:assets/gauntlet/hero-down-a.webp@@","hero-down-b":"@@asset:assets/gauntlet/hero-down-b.webp@@","hero-up-a":"@@asset:assets/gauntlet/hero-up-a.webp@@","hero-up-b":"@@asset:assets/gauntlet/hero-up-b.webp@@","hero-side-a":"@@asset:assets/gauntlet/hero-side-a.webp@@","hero-side-b":"@@asset:assets/gauntlet/hero-side-b.webp@@","ghost-a":"@@asset:assets/gauntlet/ghost-a.webp@@","ghost-b":"@@asset:assets/gauntlet/ghost-b.webp@@","grunt-a":"@@asset:assets/gauntlet/grunt-a.webp@@","grunt-b":"@@asset:assets/gauntlet/grunt-b.webp@@","demon-a":"@@asset:assets/gauntlet/demon-a.webp@@","demon-b":"@@asset:assets/gauntlet/demon-b.webp@@","lobber-a":"@@asset:assets/gauntlet/lobber-a.webp@@","lobber-b":"@@asset:assets/gauntlet/lobber-b.webp@@","sorcerer-a":"@@asset:assets/gauntlet/sorcerer-a.webp@@","death-a":"@@asset:assets/gauntlet/death-a.webp@@","death-b":"@@asset:assets/gauntlet/death-b.webp@@","wall":"@@asset:assets/gauntlet/wall.webp@@","door":"@@asset:assets/gauntlet/door.webp@@","exit":"@@asset:assets/gauntlet/exit.webp@@","exit-lit":"@@asset:assets/gauntlet/exit-lit.webp@@","office-1":"@@asset:assets/gauntlet/office-1.webp@@","office-2":"@@asset:assets/gauntlet/office-2.webp@@","office-3":"@@asset:assets/gauntlet/office-3.webp@@","lunch":"@@asset:assets/gauntlet/lunch.webp@@","bell":"@@asset:assets/gauntlet/bell.webp@@","money":"@@asset:assets/gauntlet/money.webp@@","key":"@@asset:assets/gauntlet/key.webp@@","baseball":"@@asset:assets/gauntlet/baseball.webp@@","dodgeball":"@@asset:assets/gauntlet/dodgeball.webp@@","wad":"@@asset:assets/gauntlet/wad.webp@@","poof":"@@asset:assets/gauntlet/poof.webp@@","valk-down-a":"@@asset:assets/gauntlet/valk-down-a.webp@@","valk-down-b":"@@asset:assets/gauntlet/valk-down-b.webp@@","valk-up-a":"@@asset:assets/gauntlet/valk-up-a.webp@@","valk-up-b":"@@asset:assets/gauntlet/valk-up-b.webp@@","valk-side-a":"@@asset:assets/gauntlet/valk-side-a.webp@@","valk-side-b":"@@asset:assets/gauntlet/valk-side-b.webp@@","valk-item":"@@asset:assets/gauntlet/valk-item.webp@@","wiz-down-a":"@@asset:assets/gauntlet/wiz-down-a.webp@@","wiz-down-b":"@@asset:assets/gauntlet/wiz-down-b.webp@@","wiz-up-a":"@@asset:assets/gauntlet/wiz-up-a.webp@@","wiz-up-b":"@@asset:assets/gauntlet/wiz-up-b.webp@@","wiz-side-a":"@@asset:assets/gauntlet/wiz-side-a.webp@@","wiz-side-b":"@@asset:assets/gauntlet/wiz-side-b.webp@@","wiz-item":"@@asset:assets/gauntlet/wiz-item.webp@@","elf-down-a":"@@asset:assets/gauntlet/elf-down-a.webp@@","elf-down-b":"@@asset:assets/gauntlet/elf-down-b.webp@@","elf-up-a":"@@asset:assets/gauntlet/elf-up-a.webp@@","elf-up-b":"@@asset:assets/gauntlet/elf-up-b.webp@@","elf-side-a":"@@asset:assets/gauntlet/elf-side-a.webp@@","elf-side-b":"@@asset:assets/gauntlet/elf-side-b.webp@@","elf-item":"@@asset:assets/gauntlet/elf-item.webp@@","wall-1":"@@asset:assets/gauntlet/wall-1.webp@@","wall-2":"@@asset:assets/gauntlet/wall-2.webp@@","wall-3":"@@asset:assets/gauntlet/wall-3.webp@@","wall-4":"@@asset:assets/gauntlet/wall-4.webp@@","wall-5":"@@asset:assets/gauntlet/wall-5.webp@@","wall-6":"@@asset:assets/gauntlet/wall-6.webp@@","wall-7":"@@asset:assets/gauntlet/wall-7.webp@@"};
// Sprite and on-page height of each monster at level 3; lower levels are drawn a little smaller.
// True to scale (owner 2026-10-30): like the cabinet, every student fits about one locker, the principal a little taller.
// Everyone the same size (owner 2026-10-30): each drawn 56 tall from the top of the head to the feet, like the students;
// the hall monitor's clipboard and the lobber's raised arm reach above that, so their frames are taller.
const LOOK={ghost:['ghost',56,2],grunt:['grunt',68,2],demon:['demon',56,2],lobber:['lobber',63,2],sorcerer:['sorcerer',57,1],death:['death',58,2]};
// The four heroes of the player select: their sprite prefix and thrown thing, in CONFIG.heroes order.
const HERO_ART=[['hero','baseball'],['valk','valk-item'],['wiz','wiz-item'],['elf','elf-item']];
const ITEMS={f:['lunch',34],p:['bell',34],$:['money',36],k:['key',38]},LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],up:['ArrowUp','w','W'],down:['ArrowDown','s','S'],fire:[' '],magic:['Shift']};
async function texture(P,src){const img=new Image();img.src=src;await img.decode();return P.Texture.from(img)}

// The cabinet's sounds: the throw, hits, pickups, the gate, the potion's blast, the ghost's hit and the way down.
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.beat=0}
 on(){return this.bus&&this.save?.settings.sound!==false}
 event(e){if(!this.on())return;const b=this.bus;b.unlock?.();if(b.gameSample?.('locker-gauntlet',e))return;
  if(e.type==='shot')b.tone(520,.04,.015,'triangle');
  else if(e.type==='hit')b.tone(220,.04,.02,'square');
  else if(e.type==='kill')b.noise(e.magic?.05:.08,1300,.04);
  else if(e.type==='generator')b.noise(.14,600,.06);
  else if(e.type==='pickup')for(let i=0;i<3;i++)b.tone((e.item==='food'?520:e.item==='key'?880:1040)+i*180,.05,.025,'square',i*.05);
  else if(e.type==='door')for(let i=0;i<3;i++)b.tone(160-i*30,.08,.03,'sawtooth',i*.07);
  else if(e.type==='magic')b.noise(.6,2600,.08);
  else if(e.type==='hurt')b.tone(e.kind==='death'?90:140,.05,.02,'sawtooth');
  else if(e.type==='ghostHit')b.noise(.3,400,.08);
  else if(e.type==='throw')b.tone(e.kind==='rock'?700:300,.05,.012,'triangle');
  else if(e.type==='shotFood')for(let i=0;i<3;i++)b.tone(400-i*90,.08,.03,'square',i*.08);
  else if(e.type==='allyDown')for(let i=0;i<3;i++)b.tone(260-i*60,.12,.03,'triangle',i*.12);
  else if(e.type==='exit')for(let i=0;i<8;i++)b.tone(900-i*90,.06,.025,'square',i*.06);
  else if(e.type==='gameover')for(let i=0;i<4;i++)b.tone(300-i*50,.18,.04,'triangle',i*.2)}
 // A heartbeat once health is low.
 loop(engine,dt){if(!this.on()||engine.state!=='play'||engine.health>=C.lowHealth)return;this.beat-=dt;if(this.beat<=0){this.beat=engine.health<C.dyingHealth?.45:.8;this.bus.gameTone('locker-gauntlet','heartbeat-voice',70,.08,.03,'sine');this.bus.gameTone('locker-gauntlet','heartbeat-voice',60,.08,.025,'sine',.14)}}
}

class GauntletGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.tap={};this.pad={};this.sounds=new Sounds(services);this.puffs=[];this.note=null}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');this.P=P;
  const app=new P.Application();await app.init({width:W,height:H,backgroundAlpha:0,antialias:true,resolution:Math.min(2,devicePixelRatio||1),autoDensity:true});this.app=app;
  Object.assign(app.canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(app.canvas);
  this.tex={};for(const k of names)this.tex[k]=await texture(P,art[k]);
  // The hallway scrolls under a window below the score line.
  this.world=new P.Container();this.world.position.set(0,C.top);app.stage.addChild(this.world);const mask=new P.Graphics().rect(0,C.top,C.viewW,C.viewH).fill(0xffffff);app.stage.addChild(mask);this.world.mask=mask;
  const layer=(sort)=>{const c=new P.Container();c.sortableChildren=!!sort;this.world.addChild(c);return c};
  this.tileLayer=layer();this.itemLayer=layer();this.labelLayer=layer();this.actorLayer=layer(true);this.fxLayer=layer();
  this.player=new P.Sprite(this.tex['hero-down-a']);this.player.anchor.set(.5,.8);this.actorLayer.addChild(this.player);
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'});
  this.hud=new P.Container();app.stage.addChild(this.hud);this.panel=new P.Graphics();this.hud.addChild(this.panel);const text=(size,ax=.5,ay=0,parent=this.hud)=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(ax,ay);parent.addChild(t);return t};
  this.scoreText=text(52,0);this.healthText=text(30,0);this.levelText=text(22,1);this.bestText=text(22);this.pointsText=text(22);this.noteText=text(30,.5,.5);this.message=text(52,.5,.5);this.sub=text(30,.5,.5);
  this.icons={};for(const k of ['key','bell']){const s=new P.Sprite(this.tex[k]);s.anchor.set(.5);this.hud.addChild(s);this.icons[k]=s;this.icons[k+'Text']=text(22,0,.5)}
  this.text=text;this.labels=[];this.allyLabels=[];
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
  else if(this.mode==='select'){if(['ArrowLeft','a','A'].includes(k))this.heroPick=(this.heroPick+3)%4;else if(['ArrowRight','d','D'].includes(k))this.heroPick=(this.heroPick+1)%4;else if(k===' '||k==='Enter')this.choose()}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // The player select (owner 2026-10-30), as on the cabinet: pick a student before the first hall.
 choose(){this.mode='play';this.fireArmed=false;this.held={};this.tap={};this.sounds.event?.({type:'pickup',item:'key'})}
 // Controller: stick (with a dead zone) or D-pad walks in eight directions; A throws (hold to stand and aim); X rings the bell; Menu pauses; A confirms on the end screens.
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={};if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,x=p.axes[0]||0,y=p.axes[1]||0,dz=v=>Math.abs(v)<.2?0:Math.sign(v)*Math.min(1,(Math.abs(v)-.2)/.7);
   now.axis=dz(x);now.axisY=dz(y);now.left=b(14);now.right=b(15);now.up=b(12)||y<-.5;now.down=b(13)||y>.5;now.dup=b(12);now.ddown=b(13);now.fire=b(0);now.magic=b(2);now.pause=b(9)}
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='select'){if(now.left&&!this.pad.left||now.axis<-.5&&!(this.pad.axis<-.5))this.edge('ArrowLeft');if(now.right&&!this.pad.right||now.axis>.5&&!(this.pad.axis>.5))this.edge('ArrowRight');if(now.fire&&!this.pad.fire)this.edge(' ')}
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.fire&&!this.pad.fire)this.edge(' ')}
  this.pad=now}
 // Fire counts only once it has been let go since play resumed, so the A that starts the page does not throw.
 // A key tapped and let go between two frames still counts for one step.
 // Touch: drag to walk; a tap throws, a second finger held aims and throws; a two-finger tap rings the bell.
 input(){const pad=this.pad,h=this.held,T=this.touch,s=T.stick(),t={...this.tap,magic:this.tap.magic||T.take('twos')>0};if(T.take('taps').length)t.fire=true;const fire=!!(h.fire||pad.fire||T.fingers.size>1||t.fire&&this.fireArmed);this.tap={};if(!fire)this.fireArmed=true;
  const kx=(h.right||pad.right?1:0)-(h.left||pad.left?1:0),ky=(h.down||pad.ddown?1:0)-(h.up||pad.dup?1:0);return{axis:kx||pad.axis||s.x,axisY:ky||pad.axisY||s.y,fire:fire&&this.fireArmed,magic:!!(h.magic||pad.magic||t.magic),hero:this.mode==='demo'?0:this.heroPick+1}}
 newGame(seed=this.seed){this.seed=seed;this.endHold=0;this.tap={};this.engine=new GauntletCore.GauntletEngine(seed);this.heroPick??=0;this.rec=g.No2Leaderboard?.recorder(ID,seed,GauntletCore)||null;this.paused=false;this.puffs=[];this.note=null;if(this.mode!=='demo')this.mode='select';this.initials=null}
 pause(){if(this.mode==='play'||this.mode==='demo'){this.paused=!this.paused;this.tap={}}}
 frame(dt){dt=Math.min(dt,.1);this.readPad();
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'&&this.mode!=='select'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?this.engine.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,this.engine);this.engine.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.loop(this.engine,dt);if(this.note)this.note.life-=dt;// The jock blinks out for a moment before the end screen.
   if(this.engine.state==='end'&&(this.endHold+=dt)>=1.6)this.endGame()}
  for(const f of this.puffs)f.life-=dt;this.puffs=this.puffs.filter(f=>f.life>0);
  this.render()}
 drain(){const e=this.engine;for(const ev of e.events.splice(0)){this.sounds.event(ev);if(this.mode==='play'&&!this.ai)g.No2Victories?.event(ID,ev,e);
   if(ev.type==='say')this.note={text:ev.text,life:C.sayTime};
   if(ev.type==='kill'||ev.type==='ghostHit'||ev.type==='generator'||ev.type==='shotFood'||ev.type==='deathLeft')this.puffs.push({x:ev.x,y:ev.y,life:.4,size:ev.type==='generator'?72:56,text:ev.points?String(ev.points):''});
   if(ev.type==='pickup'&&ev.points)this.puffs.push({x:ev.x,y:ev.y,life:.5,size:0,text:String(ev.points)});
   if(ev.type==='magic'&&ev.shot)this.puffs.push({x:ev.x,y:ev.y,life:.6,size:C.blast*T*1.4});
   if(this.mode==='play'&&ev.type==='gameover')this.services.save?.record(ID,'gameover',{score:ev.score})}}
 endGame(){if(this.mode==='demo'){this.newGame(this.seed+1);return}const score=this.engine.score,save=this.services.save,rows=save?.scores(ID)||[];
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');if(save){const rows=[...save.scores(ID),{name,score:it.score}].sort((a,b)=>b.score-a.score).slice(0,10);save.storage.write(save.key(ID,'scores'),rows);save.storage.write(save.key(ID,'best'),Math.max(save.best(ID),it.score));save.notify?.()}g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 // Lockers differ along the halls (owner 2026-10-30): about half plain, the rest dented, coloured, open, locked or taped.
 wallAt(c,r,l){const h=(Math.imul(c+1,73856093)^Math.imul(r+1,19349663)^Math.imul(l,83492791))>>>0;const k=h%14;return k<7?'wall':'wall-'+(k-6)}
 pool(layer,list,n,t){while(list.length<n){const s=new this.P.Sprite(this.tex[t]);s.anchor.set(.5);layer.addChild(s);list.push(s)}list.forEach((s,i)=>s.visible=i<n);return list}
 fit(s,k,size,dim='height'){const t=this.tex[k];if(s.texture!==t)s.texture=t;const sc=size/t[dim];s.scale.set(sc);return sc}
 render(){const e=this.engine,Tx=this.tex,v=e.view(),step=Math.floor(e.clock*6)%2;this.world.pivot.set(v.x,v.y);
  // Only the squares in view are drawn: lockers, gates, stairwells, offices and the pickups lying on the floor.
  const c0=Math.max(0,Math.floor(v.x/T)),c1=Math.min(e.cols-1,Math.floor((v.x+v.w)/T)),r0=Math.max(0,Math.floor(v.y/T)),r1=Math.min(e.rows-1,Math.floor((v.y+v.h)/T));
  const tiles=[],items=[],exits=[];for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){const ch=e.map[r][c];if(ch==='#'||ch==='=')tiles.push([c,r,ch==='#'?this.wallAt(c,r,e.level):'door']);else if(ch==='E'||ch>='2'&&ch<='9'){tiles.push([c,r,Math.floor(e.clock*2)%2?'exit-lit':'exit']);if(ch!=='E')exits.push([c,r,ch])}else if(ITEMS[ch])items.push([c,r,ch])}
  const tp=this.pool(this.tileLayer,this.tileSprites??=[],tiles.length,'wall');tiles.forEach(([c,r,k],i)=>{const s=tp[i];if(s.texture!==Tx[k])s.texture=Tx[k];s.scale.set(T/Tx[k].width,T/Tx[k].height);s.position.set((c+.5)*T,(r+.5)*T)});
  const ip=this.pool(this.itemLayer,this.itemSprites??=[],items.length,'key');items.forEach(([c,r,ch],i)=>{const [k,size]=ITEMS[ch];this.fit(ip[i],k,size,'width');ip[i].rotation=k==='key'?-.5:0;ip[i].position.set((c+.5)*T,(r+.5)*T)});
  // Exits that skip ahead carry the level they lead to.
  while(this.labels.length<exits.length){const t=this.text(22,.5,.5,this.labelLayer);t.style.stroke={color:0xfbf3e2,width:6,join:'round'};this.labels.push(t)}this.labels.forEach((t,i)=>{t.visible=i<exits.length;if(t.visible){const [c,r,ch]=exits[i];const n=Math.floor((e.level-1)/GauntletCore.LEVELS.length)*GauntletCore.LEVELS.length+Number(ch);t.text='to '+n;t.style.fontSize=this.metaPx||22;t.position.set((c+.5)*T,(r+.5)*T)}});
  // People and offices, drawn back to front.
  const actors=e.gens.filter(o=>o.c>=c0-1&&o.c<=c1+1&&o.r>=r0-1&&o.r<=r1+1).map(o=>['office-'+o.level,(o.c+.5)*T,(o.r+1)*T-2,T*1.05,'width',1,0,1]);
  for(const m of e.monsters){if(!e.onScreen(m,T))continue;const [k,h,frames]=LOOK[m.kind],size=h*(m.kind==='death'?1:.98+.01*m.level);
   actors.push([k+'-'+(frames>1&&step?'b':'a'),m.x,m.y+size*.45,size,'height',m.dir<0?-1:1,0,m.kind==='sorcerer'&&!m.seen?.12:1])}
  const ap=this.pool(this.actorLayer,this.actorSprites??=[],actors.length,'ghost-a');
  actors.forEach(([k,x,y,size,dim,flip,rot,alpha],i)=>{const s=ap[i];s.anchor.set(.5,1);const sc=this.fit(s,k,size,dim);s.scale.x=sc*flip;s.alpha=alpha;s.position.set(x,y);s.zIndex=y});
  const p=e.player,f=p.face,dir=f>=1&&f<=3?'down':f>=5&&f<=7?'up':'side',walk=p.moving&&step?'b':'a';this.player.anchor.set(.5,1);
  const pre=HERO_ART[C.heroes.indexOf(e.hero)]?.[0]||'hero',sc=this.fit(this.player,pre+'-'+dir+'-'+walk,56);this.player.scale.x=dir==='side'&&f===4?-sc:sc;this.player.position.set(p.x,p.y+24);this.player.zIndex=p.y+24;this.player.visible=e.state!=='end'||Math.floor(e.clock*8)%2===0;
  // The three classmates (owner 2026-10-30), drawn like the player; one low on health blinks, with its health over its head.
  const al=e.allies.filter(a=>!a.down),asp=this.pool(this.actorLayer,this.allySprites??=[],al.length,'hero-down-a');
  while(this.allyLabels.length<al.length){const t=this.text(22,.5,1,this.labelLayer);t.style.fill=0xb3261e;t.style.stroke={color:0xfbf3e2,width:6,join:'round'};this.allyLabels.push(t)}
  this.allyLabels.forEach((t,i)=>{const a=al[i];t.visible=!!a&&a.health<C.lowHealth;if(t.visible){t.text=String(a.health);t.style.fontSize=this.metaPx||22;t.position.set(a.x,a.y-40)}});
  al.forEach((a,i)=>{const s=asp[i],f=a.face,d=f>=1&&f<=3?'down':f>=5&&f<=7?'up':'side',pre=HERO_ART[C.heroes.indexOf(a.hero)]?.[0]||'hero';s.anchor.set(.5,1);const sc=this.fit(s,pre+'-'+d+'-'+(a.moving&&step?'b':'a'),56);
   s.scale.x=d==='side'&&f===4?-sc:sc;s.position.set(a.x,a.y+24);s.zIndex=a.y+24;s.rotation=0;s.alpha=a.health<C.dyingHealth&&Math.floor(e.clock*4)%2?.45:1});
  // Thrown things: everyone's own throw, dodgeballs, and paper wads arcing over the lockers.
  const shots=[],throwOf=(who,sh)=>{const it=HERO_ART[C.heroes.indexOf(who.hero)]?.[1]||'baseball';shots.push([it,sh.x,sh.y,it==='elf-item'?26:18,it==='elf-item'?Math.atan2(sh.vy,sh.vx):e.clock*20])};if(e.shot)throwOf(e,e.shot);for(const a of e.allies)if(a.shot)throwOf(a,a.shot);for(const o of e.missiles)shots.push(o.kind==='fireball'?['dodgeball',o.x,o.y,20,0]:['wad',o.x,o.y-(o.h||0),18,e.clock*8]);
  const fp=this.pool(this.fxLayer,this.shotSprites??=[],shots.length,'baseball');shots.forEach(([k,x,y,size,rot],i)=>{this.fit(fp[i],k,size,'width');fp[i].rotation=rot;fp[i].position.set(x,y);fp[i].alpha=1});
  const pf=this.puffs.filter(f=>f.size),pp=this.pool(this.fxLayer,this.puffSprites??=[],pf.length,'poof');pf.forEach((f,i)=>{const s=pp[i];this.fit(s,'poof',f.size,'width');s.alpha=Math.min(1,f.life*4);s.position.set(f.x,f.y)});
  const hit=this.puffs.find(f=>f.text);this.pointsText.text=hit?hit.text:'';if(hit)this.pointsText.position.set(hit.x-v.x,hit.y-v.y+C.top-48);
  this.scoreText.text=String(e.score).padStart(5,'0');this.healthText.text='health '+e.health;this.healthText.style.fill=e.health<C.dyingHealth?0xb3261e:INK;
  this.levelText.text='level '+e.level;this.icons.keyText.text='x'+e.keys;this.icons.bellText.text='x'+e.potions;
  const best=this.services.save?.best(ID)||0;this.bestText.text=best?'best '+Math.max(best,this.mode!=='demo'&&!this.ai?e.score:0):'';
  this.noteText.text=this.note&&this.note.life>0&&this.mode!=='over'&&this.mode!=='initials'?this.note.text:'';
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')+(pad?'':g.No2?.deviceMode==='touch'?'   (swipe, then tap)':'   (type, then Enter)')}
  else if(this.mode==='over'){msg='final grade.';sub=(pad?'press A to play again':g.No2?.deviceMode==='touch'?'tap to play again':'press Space to play again')}
  else if(e.state==='exit')msg='down the stairs.';
  // Tracing paper over the field while a message holds play (owner 2026-10-26).
  this.tracing?.show(!!msg||this.mode==='select');this.message.text=msg;this.sub.text=sub;this.typeScale();this.drawSelect();
  // The in-play note sits on a cream slip with a thin ink border, so the lockers never run through the words; messages lie on the tracing sheet.
  const pn=this.panel.clear(),slip=list=>{const ts=list.filter(t=>t.text);if(!ts.length)return;const pad=10,x0=Math.min(...ts.map(t=>t.x-t.width/2))-pad*2,x1=Math.max(...ts.map(t=>t.x+t.width/2))+pad*2,y0=Math.min(...ts.map(t=>t.y-t.height/2))-pad,y1=Math.max(...ts.map(t=>t.y+t.height/2))+pad;
   pn.roundRect(x0,y0,x1-x0,y1-y0,6).fill({color:0xfbf3e2,alpha:.94}).stroke({color:INK,width:1.5})};slip([this.noteText])}
 // The player select (owner 2026-10-30): four students on the tracing sheet, each with the cabinet's five ratings as
 // dots; left and right choose, Space or A (or a tap on a card) starts.
 drawSelect(){const P=this.P,on=this.mode==='select';if(!this.selectC){if(!on)return;const c=new P.Container();this.app.stage.addChild(c);this.selectC=c;this.selCards=[];
   const T=(size,ax,ay)=>{const t=new P.Text({text:'',style:{fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:INK,align:'center'}});t.anchor.set(ax,ay);c.addChild(t);return t};
   this.selTitle=T(52,.5,.5);this.selSub=T(30,.5,.5);this.selNote=T(30,.5,.5);const names=['the jock','the captain','the science kid','the runner'],R=[[2,3,3,1,1],[3,2,2,2,2],[1,2,1,3,2],[1,1,2,2,3]],L=['armor','throw','fight','magic','speed'];
   for(let i=0;i<4;i++){const card=new P.Container(),ring=new P.Graphics(),sp=new P.Sprite(this.tex[HERO_ART[i][0]+'-down-a']);sp.anchor.set(.5,1);card.addChild(ring,sp);const nm=new P.Text({text:names[i],style:{fontFamily:'Schoolhand, sans-serif',fontSize:28,fill:INK}});nm.anchor.set(.5,0);card.addChild(nm);
    const dots=new P.Graphics(),labels=L.map(w=>{const t=new P.Text({text:w,style:{fontFamily:'Schoolhand, sans-serif',fontSize:20,fill:INK}});t.anchor.set(1,.5);card.addChild(t);return t});card.addChild(dots);
    card.eventMode='static';card.cursor='pointer';card.on('pointertap',()=>{if(this.mode!=='select')return;if(this.heroPick===i)this.choose();else this.heroPick=i});c.addChild(card);this.selCards.push({card,ring,sp,nm,dots,labels,r:R[i]})}}
  this.selectC.visible=on;if(!on)return;const pad=g.No2?.deviceMode==='xbox',touch=g.No2?.deviceMode==='touch';
  this.selTitle.text='pick a student.';this.selTitle.style.fill=0x1d8a3d;this.selSub.text=touch?'tap twice to start':pad?'press A to start':'press Space to start';
  this.selNote.text='the other three come along as your classmates.';this.selTitle.position.set(W/2,H*.11);this.selNote.position.set(W/2,H*.82);this.selSub.position.set(W/2,H*.91);const cw=W/4.6;
  this.selCards.forEach((o,i)=>{const x=W/2+(i-1.5)*cw*1.08,y=H*.2;o.card.position.set(x,y);const sc=150/o.sp.texture.height;o.sp.scale.set(sc);o.sp.position.set(0,190);o.nm.position.set(0,198);
   o.ring.clear();if(i===this.heroPick)o.ring.roundRect(-cw/2,0,cw,400,14).fill({color:0xfff1c8,alpha:.55}).stroke({color:0x1b3591,width:3});
   o.dots.clear();o.labels.forEach((t,j)=>{const y2=250+j*30;t.position.set(-6,y2);for(let d=0;d<3;d++){const filled=d<o.r[j];o.dots.circle(14+d*22,y2,8);if(filled)o.dots.fill({color:0x1b3591});else o.dots.stroke({color:0x1b3591,width:2})}})})}
// UI type rules (owner 2026-10-24): sizes in on-screen pixels scaled from 1080p, converted to the canvas's logical units.
 typeScale(){const c=this.app?.canvas,w=c?.getBoundingClientRect().width||0;if(!w)return;const u=Math.min(innerWidth/1920,innerHeight/1080),k=w/W,key=u+'|'+k+'|'+this.message.text+'|'+this.sub.text;if(this.typeKey===key)return;this.typeKey=key;const px=n=>Math.max(n*u,n*.55)/k;
  for(const t of [this.scoreText,this.message])t.style.fontSize=px(52);for(const t of [this.levelText,this.bestText,this.pointsText,this.icons.keyText,this.icons.bellText,...this.labels])t.style.fontSize=px(22);for(const t of [this.sub,this.healthText,this.noteText])t.style.fontSize=px(30);this.metaPx=px(22);
  this.scoreText.position.set(12,0);this.healthText.position.set(12+px(52)*3.4,px(52)*.28);this.levelText.position.set(W-12,px(52)*.3);this.bestText.position.set(W/2+60,px(52)*.3);
  const ix=W-12-px(22)*4.6,iy=px(52)*.55;this.icons.key.position.set(ix-px(22)*4.2,iy);this.icons.key.scale.set(px(22)*1.4/this.tex.key.width);this.icons.key.rotation=-.5;this.icons.keyText.position.set(ix-px(22)*3.4,iy);
  this.icons.bell.position.set(ix-px(22)*1.4,iy);this.icons.bell.scale.set(px(22)*1.2/this.tex.bell.height);this.icons.bellText.position.set(ix-px(22)*.6,iy);
  this.noteText.position.set(W/2,H-px(30)*1.1);this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.app?.canvas?.getBoundingClientRect().width>0)?[]:[this.scoreText,this.healthText,this.levelText,this.bestText,this.pointsText,this.noteText,this.message,this.sub,this.icons.keyText,this.icons.bellText,...this.labels,...this.allyLabels].filter(t=>t.text&&t.visible).map(t=>({text:t.text,size:+(t.style.fontSize*k).toFixed(1)}))}
}

class GauntletAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1985){if(this.api)return this.api;const frame=document.createElement('div');frame.id='gauntlet-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  try{const game=await new GauntletGame(this.services,frame,seed).init();if(this.frame!==frame){game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={engine:null,get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},tests:{run:()=>GauntletTests.run(GauntletCore,()=>{})},audio:{thrusting(){}},game};
   Object.defineProperty(api,'engine',{get:()=>game.engine});this.api=api;return api}
  catch(error){await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.tap={};this.game.fireArmed=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){removeEventListener('keydown',game.onKey);removeEventListener('keyup',game.offKey);try{textures=Object.keys(game.tex).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.tex).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2Gauntlet={Adapter:GauntletAdapter,Game:GauntletGame,art};
})(globalThis);
