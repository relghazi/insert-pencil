'use strict';
// Scribble Defender play page (owner 2026-10-27: like every other notebook). Runs ScribbleCore at a fixed 120 Hz and draws it
// with its own renderer straight onto the host page (no iframe): the ready card, pause sheet, tracing paper, initials,
// high scores, tiny victories, leaderboard recorder and sounds are the shared ones. Its look is unchanged: the scenery,
// students, radar card and world-fixed ground below used to be the old frame's presentation layer, now applied here.
(function(g){
const ID='scribble-defender',C=ScribbleCore.CONFIG,W=C.width,H=C.height;
const LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// The rule checks (deterministic-tests.js) attach to the object left in __SCRIBBLE_API__ just before this script.
const RULES=g.__SCRIBBLE_API__;
const KEYS={left:['ArrowLeft','a','A'],right:['ArrowRight','d','D'],up:['ArrowUp','w','W'],down:['ArrowDown','s','S'],fire:[' '],thrust:['Shift'],reverse:['r','R'],bomb:['b','B'],warp:['h','H']};
// On-screen text sizes for the UI type rules, set by the playing notebook each frame (see view()).
const view={u:1,k:1,quiet:false};

// Presentation (owner 2026-10-24 to 2026-10-27), applied once to the scene builder.
const SCALE={'enemy-bullet':1.55,mine:1.25,'player-idle':.82,'player-reverse':.82};
// Scenery in proportion to a student (about 69 game pixels tall): the hoop about two students, the trees three and a third,
// the school two storeys with its clock (a little over four), the water tower tallest (five and a half, a little faded as it
// stands further back). SCENE is the drawn art's height in game pixels; ART is each frame's height over width and where its
// drawing starts and ends, top to bottom, so the drawing's own foot meets the ground.
const SCENE={school:290,'water-tower':380,'basketball-hoop':140,trees:230},FAR={'water-tower':.75},ART={school:[.41,.029,.971],'water-tower':[1.538,.012,.988],'basketball-hoop':[1.605,.014,.986],trees:[.727,.016,.984]};
// The ground exactly as the renderer draws it (smooth curve through the engine's points plus the hand wobble).
// Where each ground strip's solid grass begins, as a share of its height (the blade tips stand above it).
const GRASS_LINE={1:.241,2:.122,3:.219};
// Where each ground strip's soil ends and its hatching is still dark (shares of its height, from the strips' alpha), so the
// hatching between them can reach down under tall hills.
const SOIL={1:[.74,.84],2:[.56,.74],3:[.68,.8]};
const NODE=C.terrainNode||180,groundAt=(e,w)=>{const n=Math.floor(w/NODE),f=w/NODE-n,p=k=>e.terrain(ScribbleCore.wrap((n+k)*NODE)),a=p(-1),b=p(0),c=p(1),d=p(2);return b+.5*f*(c-a+f*(2*a-5*b+4*c-d+f*(3*(b-c)+d-a)))+1.2*Math.sin(w*.031)+.7*Math.sin(w*.083)};
// Where each drawing touches the ground, as [offset from its centre, half width] in sprite widths.
const FOOT={'basketball-hoop':[-.3,.12],school:[0,.42],'water-tower':[0,.3],trees:[0,.3]};
// The hills are tall and varied (core 0.7.0), so each piece of scenery moves (at most 400 px from its place every 1900 px)
// to the flattest ground near it, nearer its place when two spots are as flat; the hills never change, so it is worked out once.
const SEATS=new Map();
function seat(e,i,id,w,fo,fh){const key=i+':'+id;if(e.feelScene)return 0;if(SEATS.has(key))return SEATS.get(key);let best=0,score=1e9;
 for(let off=-400;off<=400;off+=20){let lo=1e9,hi=-1e9;for(let t=-1;t<=1;t+=.25){const y=e.terrain(i*1900+780+off+w*fo+t*w*fh);lo=Math.min(lo,y);hi=Math.max(hi,y)}const k=hi-lo+Math.abs(off)*.01;if(k<score){score=k;best=off}}
 SEATS.set(key,best);return best}
// Falling and struggling frames are drawn smaller inside their cells than walking ones: match the walking figure's size.
const POSE={fall:1.46,struggle:1.1};
// A carried student hangs under the ship by the hands (struggle pose), drawn in front of it: shown as a walking figure at the
// ship's middle they were hidden behind it and seemed to vanish when caught (owner 2026-11-02, Ken Lobb's playtest).
// HANG is how far below the ship's centre the figure's hands reach; a teen frame is 96 x 160 with its foot at .9.
const HANG=6,TEEN_H=160/96,hangY=(shipY,rowOffset,w)=>shipY+HANG+.9*w*TEEN_H+rowOffset;
// The scribble-out (lost student): the pen draws for .35 s, holds, then figure and scribble fade out by 1.25 s.
const SCRIBBLE={draw:.35,hold:.55,duration:1.25};
// Where the figure is drawn inside a teen cell (measured from the atlas): left, top, right, bottom as shares of the cell.
const FIGURE={walk:[.12,.06,.88,.99],fall:[.07,.47,.93,.95],struggle:[.09,.15,.91,.98]};
// Her pen going back and forth over a box in slanted, looping strokes (seeded, so a scribble keeps its shape while drawn).
function scribblePath(seed,x,y,w,h){let s=(seed>>>0)||1;const r=()=>(s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296,rows=5+Math.floor(r()*2),pts=[];
 for(let k=0;k<=rows;k++){const ty=y+h*k/rows,back=k%2===1;for(let i=0;i<=28;i++){const t=back?1-i/28:i/28,ph=i/28*Math.PI*7+k*1.3;
  pts.push([x+w*t+Math.cos(ph)*w*.08+(r()-.5)*1.2,ty+Math.sin(ph)*h*.07-(t-.5)*h*.16+(r()-.5)*1.2])}}return pts}
// Which way the baiter and the swarmers face (owner 2026-11-02, Ken Lobb's playtest: they were drawn flying backwards; both
// drawings face right): the way they move across the page, kept until the motion clearly turns (no flicker overhead).
const facing=new WeakMap();let faced=[];
const faceOf=(e,n)=>{if(n.type!=='baiter'&&n.type!=='swarmer')return false;const v=n.type==='baiter'?n.aimX:n.vx;let f=facing.get(n);
 if(f===undefined)f=v?v<0:ScribbleCore.delta(e.p.x,n.x)<0;else if(Math.abs(v)>40)f=v<0;facing.set(n,f);return f};
// A killed enemy's burst keeps the way it faced (the first frames still show it).
const facingAt=(type,x,y)=>{let best=null,d=1e9;for(const q of faced)if(q.type===type){const k=Math.abs(ScribbleCore.delta(q.x,x))+Math.abs(q.y-y);if(k<d){d=k;best=q}}return !!(best&&d<160&&best.flip)};
// Touch zones (owner 2026-11-02, Ken Lobb's playtest item 16, an EXPERIMENT): the left 40% of the screen is the ship's
// height (the thumb's height over the screen, 12% to 88%, is where the ship flies to: thumb at the top, ship at the top),
// and her ink buttons sit bottom right: fire in the middle (held, it keeps firing), a thrust button each side of it (the
// way it points is the way she flies: it turns the ship and thrusts, like the arrow keys), bomb above. A thumb between
// fire and an arrow presses both. R is a button's radius in screen pixels, GAP the spacing of their centres in radii, HIT
// how far from its centre a button still takes the thumb (in radii), EASE how close (game pixels) the ship slows to its mark.
// settings.defenderTouch 'stick' keeps the old touch play (first finger a stick, tap fires, two-finger tap bombs).
const ZONE={left:.4,top:.12,bottom:.88,R:34,gap:1.9,hit:1.25,ease:24};
let lastTexts=[],scenePatched=false;
// Keeps these children last in p, in this order, re-adding them only when they are not: in Pixi 8 every addChild marks
// the render group's structure changed and rebuilds it, so doing it each frame cost a rebuild a frame.
const keepLast=(p,list)=>{list=list.filter(Boolean);const n=p.children.length,k=list.length;if(list.every((c,i)=>p.children[n-k+i]===c))return;for(const c of list)p.addChild(c)};
const planetGone=new WeakMap();
function patchScene(){if(scenePatched)return;scenePatched=true;ScribbleScene.inkRect=p=>({x:p.x,y:p.y,w:p.w,h:p.h});
 const scanner=ScribbleScene.scanner;ScribbleScene.scanner=(...args)=>{const r=scanner(...args),e=args[0];
  // The radar at true scale (owner 2026-10-28): radar-only icons (her ship, a student standing, carried off or falling),
  // each the size its drawing has on the page times the radar's vertical scale; nothing smaller than 6 pixels.
  const vs=(r.h-20)/(C.ground-C.top),kids=e?e.humans.filter(n=>n.state!=='dead'&&(n.state!=='abducted'||Math.floor(e.clock*8)%2)):[];let k=0;
  const PAGE={'radar-ship':139,'radar-swarmer':46,'radar-baiter':112};
  for(const it of r.items){if(it.id==='radar-human'){const h=kids[k++];it.id=h?.state==='abducted'?'radar-human-up':h?.state==='falling'?'radar-human-fall':'radar-human';it.w=Math.max(6,(it.id==='radar-human-fall'?69:40)*vs);it.y-=69*vs/2}
   else{it.w=Math.max(6,(PAGE[it.id]||96)*vs);/* her ship on the radar faces the way she flies (its drawing faces right) */if(it.id==='radar-ship'&&e)it.flip=e.p.dir<0}}
  return r};
 const draw=ScribbleScene.draw;ScribbleScene.draw=(...args)=>{const list=draw(...args),e=args[0];
  // The planet lost (owner 2026-10-29 polish): she scribbles the ground out along its own curve (worldGround), then the
  // ground and the scribble fade from the page, as the cabinet's planet is gone; the old flat scribble strip is not drawn.
  if(e&&!e.planet){const i=list.sprites.findIndex(q=>q.id==='planet-out');if(i>=0)list.sprites.splice(i,1);if(e.planetFx>0)planetGone.delete(e);else if(!planetGone.has(e))planetGone.set(e,e.clock)}
  const ship=list.sprites.find(q=>q.id==='player-idle'||q.id==='player-reverse'),CW=C.width,kids=e?e.humans.filter(h=>h.state!=='dead'&&e.onScreen(h.x,0)):[];let kid=0;
  // Scenery is placed here, not by the draw list: it stays drawn until it has fully left the page.
  const firstScene=list.sprites.findIndex(q=>SCENE[q.id]);for(let i=list.sprites.length-1;i>=0;i--)if(SCENE[list.sprites[i].id])list.sprites.splice(i,1);
  if(e&&e.planet){const scene=[];for(let i=0;i<Math.ceil(C.world/1900);i++){const id=['school','water-tower','basketball-hoop','trees'][i%4],[ar,at,ab]=ART[id],w=SCENE[id]/(ar*(ab-at)),[fo,fh]=FOOT[id]||[0,.35],wx=i*1900+780+seat(e,i,id,w,fo,fh),x=e.sx(wx);
    if(x<-w/2||x>CW+w/2)continue;const gw=e.cam+x-CW/2,fx=gw+w*fo;let y=-1e9;for(let t=-1;t<=1;t+=.25)y=Math.max(y,groundAt(e,fx+t*w*fh));
    scene.push({id,x,y:y+w*ar*(1-ab)+4,w,frame:0,alpha:FAR[id]||1})}
   let at=firstScene;if(at<0){at=0;while(at<list.sprites.length&&/^radar-|^laser-ink$/.test(list.sprites[at].id))at++}list.sprites.splice(at,0,...scene)}
  const hanging=[],foes=e?e.enemies.filter(n=>!n.dead&&e.onScreen(n.x,0)):[];let foe=0;faced=[];
  for(const q of list.sprites){if(q.id.startsWith('teen-')){
    if(q.ghost){// a lost student under her scribble (draw-list effects): as they were last drawn
     const fx=q.fx;q.w*=1.6*(POSE[fx.pose]||1);if(fx.ground&&e)q.y+=groundAt(e,e.cam+q.x-CW/2)-e.terrain(e.cam+q.x-CW/2);if(fx.carried)q.y=hangY(fx.y-28,0,q.w);q.aboveGrass=!(fx.ground&&!fx.depth);continue}
    const h=kids[kid++];
    if(h&&h.state==='carried'&&e){q.id=q.id.slice(0,8)+'struggle';q.w*=1.6*POSE.struggle;q.frame=Math.floor(e.clock*10)+h.variant;q.y=hangY(e.p.y,h.y-(e.p.y+28),q.w);q.aboveGrass=true;hanging.push(q);continue}
    q.w*=1.6*(POSE[q.id.slice(8)]||1);
    // A student standing deeper in the ground band (core 0.7.0, up to 36 px below the grass line) or off the ground is drawn
    // over the front grass, which would hide most of them; one on the grass line still stands in it.
    q.aboveGrass=!(h&&h.state==='ground'&&!h.depth);
    // Students on the ground step in time with how far they really move, face the way they go and stand on the drawn ground.
    if(h&&h.state==='ground'&&e){const v=Math.sin(e.clock*.5+h.variant);q.frame=Math.floor(ScribbleCore.wrap(h.x)/3.5);q.flip=v<0;q.y+=groundAt(e,e.cam+q.x-CW/2)-e.terrain(h.x)}}
   else if(/^(lander|mutant|bomber|pod|swarmer|baiter)-(idle|materialize)$/.test(q.id)){const n=foes[foe++];if(n&&e){const f=faceOf(e,n);if(f)q.flip=true;faced.push({type:n.type,x:n.x,y:n.y,flip:f})}}
   else if(SCALE[q.id])q.w*=SCALE[q.id];else if(q.id==='player-thrust'){q.w*=.82;if(ship)q.x=ship.x+(q.x-ship.x)*.82}else if(q.id==='laser-ink'&&q.height===3)q.height=5;else if(q.id==='laser-glow')q.height=14}
  // UI type rules: HUD text in on-screen pixels scaled from 1080p, converted to the game's 1440-wide logical space.
  const px=n=>Math.round(Math.max(n*view.u,n*.55)/view.k),META=px(22),CONTROL=px(26),BODY=px(30),TITLE=px(52);
  const role={'score-label':META,score:TITLE,best:META,wave:CONTROL,lives:CONTROL,bombs:CONTROL,hints:META,feel:META,speed:META,toast:META,fps:META,'tally-wave':TITLE,'tally-count':BODY,'tally-total':TITLE,'tally-grade':BODY};
  // No demo line or key hints (the cheat sheet has the keys); nothing floats over a message on the tracing sheet.
  list.texts=list.texts.filter(t=>t.key!=='demo'&&t.key!=='hints'&&t.key!=='fps'&&!(view.quiet&&(String(t.key).startsWith('popup')||t.key==='toast')));
  for(const t of list.texts){t.alpha=1;t.font='Schoolhand';t.color='#152e43';t.size=role[t.key]??(String(t.key).startsWith('popup')?BODY:String(t.key).startsWith('marker')?META:Math.max(META,t.size));
   /* texts sit on their baseline: on small screens (META large in game units) the label stood above the page top, so it and the score below it move down as far as they need (1080p unchanged) */const labelY=Math.max(META*.85,58-META),scoreY=Math.max(58+TITLE*.55,labelY+TITLE*.8);if(t.key==='score-label')t.y=labelY;if(t.key==='score')t.y=scoreY;if(t.key==='best')t.y=scoreY+TITLE*.5;if(t.key==='lives'||t.key==='bombs'){t.align='left';/* the count sits right of its last icon (four or more ships or bombs drew the 4th icon over it) */t.x=1232+Math.max(0,Math.min(6,e?(t.key==='lives'?e.lives:e.bombs):0)-3)*39;t.y=t.key==='lives'?70:104}
   if(['feel','speed','toast'].includes(t.key))t.y=771}
  // Carried students hang in front of her ship (the ship is drawn after the students in the draw list).
  if(hanging.length){for(const q of hanging)list.sprites.splice(list.sprites.indexOf(q),1);let at=-1;list.sprites.forEach((q,i)=>{if(/^player-(idle|reverse|thrust)$/.test(q.id))at=i});list.sprites.splice(at+1||list.sprites.length,0,...hanging)}
  lastTexts=list.texts;return list}}

// The renderer's own extras: paper bands behind the HUD and footer, the radar as a card of her notebook, the ground's pencil
// texture fixed to the world (tiles that scroll with the hills).
function dressRenderer(r,frame){const P=g.PIXI;r.staticScene=function(){this.staticSprite.visible=false};r.paper.visible=false;
 // The field (paper, world and the masks that clip them) as one layer, so the tracing sheet's blur softens it as a whole
 // like the other notebooks' fields; blurred on their own the masks stop clipping and the field vanishes.
 const field=new P.Container();r.page.addChildAt(field,0);for(const c of [r.paper,r.paperMask,r.world,r.worldMask])field.addChild(c);r.field=field;
 // The world's edge is soft (owner 2026-10-29 polish): the hills, scenery and everything flying fade out over the last few
 // centimetres at the page's sides, and the ground fades into the paper at the foot of the page instead of stopping on a line.
 {const c=document.createElement('canvas');c.width=1440;c.height=780;const x=c.getContext('2d'),side=x.createLinearGradient(20,0,1420,0);side.addColorStop(0,'rgba(255,255,255,0)');side.addColorStop(70/1400,'#fff');side.addColorStop(1-70/1400,'#fff');side.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=side;x.fillRect(20,135,1400,645);
  x.globalCompositeOperation='destination-in';const low=x.createLinearGradient(0,712,0,774);low.addColorStop(0,'#fff');low.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=low;x.fillRect(0,0,1440,780);
  const soft=new P.Sprite(P.Texture.from(c));field.addChildAt(soft,field.getChildIndex(r.worldMask));r.world.mask=soft;r.worldMask.visible=false;field.removeChild(r.worldMask);r.worldMask=soft}
 // On her page the drawing is laid onto the paper as a whole (multiply), so inside it sprites, words and the ground draw normally.
 frame.style.mixBlendMode='multiply';r.terrain.blendMode='normal';const sprite=r.sprite.bind(r),text0=r.text.bind(r);
 // Scenery stands behind the hills and behind everything that moves (owner 2026-10-29): its own layer at the back of the world.
 r.backLayer=new P.Container();r.world.addChildAt(r.backLayer,0);
 r.overGrass=new P.Container();r.world.addChild(r.overGrass);
 r.sprite=function(command,index,container,pool){if(container===this.world&&SCENE[command.id])container=this.backLayer;else if(container===this.world&&command.aboveGrass)container=this.overGrass;const s=sprite(command,index,container,pool);if(s.blendMode==='multiply')s.blendMode='normal';return s};
 r.text=function(t,i){const out=text0(t,i);if(this.textPool[i])this.textPool[i].blendMode='normal';return out};
 r.inkTags=new P.Graphics();r.hud.addChildAt(r.inkTags,0);const originalRender=r.render.bind(r);
 r.render=function(e,meta){const t=this.inkTags;t.clear();t.rect(0,0,1440,Math.max(133,(this.hudBand||133))).fill(0xfbf1d9);t.rect(0,727,1440,53).fill(0xfbf1d9);
  if(e&&this.scanLines){if(!this.radarCard){this.radarCard=new P.Graphics();const L=this.scanLines,par=L.parent;par.addChildAt(this.radarCard,par.getChildIndex(L))}const c=this.radarCard;c.clear();const X=420,Y=6,RW=650,RH=102,{delta}=ScribbleCore,rx=v=>X+RW/2+delta(v,e.p.x)/C.world*(RW-20);// The card itself is her drawing (owner 2026-10-29 polish): white card stock with a freehand ballpoint frame, a nine-slice
   // so the pen corners keep their shape; its frame line sits where the old drawn frame was.
   if(!this.radarArt){const tex=this.frames['radar-card'][0];this.radarArt=new P.NineSliceSprite({texture:tex,leftWidth:170,rightWidth:170,topHeight:110,bottomHeight:110});this.radarCard.parent.addChildAt(this.radarArt,this.radarCard.parent.getChildIndex(this.radarCard))}
   {const k=(RH+8)/454,s=this.radarArt;s.scale.set(k);s.width=(RW+12)/k+103;s.height=559;s.position.set(X-6-49*k,Y-4-48*k)}
   const a=rx(e.cam-C.width/2),b=rx(e.cam+C.width/2);for(const [x,d] of [[a,1],[b,-1]])c.moveTo(x+d*7,Y-3).lineTo(x,Y-3).lineTo(x,Y+RH+3).lineTo(x+d*7,Y+RH+3).stroke({color:0x1b3591,width:2,alpha:.55})}
  if(e){this.worldGround(e);this.radarInk(e)}const out=originalRender(e,meta);/* the renderer's own screen-fixed hill mesh stays hidden under the world-fixed tiles (player report 2026-11-06: its texture swam through the moving hills; render() had turned it back on every frame) */this.terrain.visible=false;this.marks??=new P.Graphics();keepLast(this.world,[this.frontGrass,this.overGrass,this.marks]);if(e)this.scribbleMarks();return out};
 // Her scribble-out over a lost student (owner 2026-11-02, Ken Lobb's playtest: no longer a solid blot): a light, partial
 // pencil scribble over the middle of the figure, drawn by her pen in SCRIBBLE.draw seconds, then fading with the figure.
 r.scribbleMarks=function(){const m=this.marks??=new P.Graphics();m.clear();
  for(const q of this.lastDraw?.sprites||[]){if(!q.ghost)continue;const fx=q.fx,fade=fx.age<fx.hold?1:Math.max(0,1-(fx.age-fx.hold)/(fx.duration-fx.hold));if(fade<=0)continue;
   const ch=q.w*TEEN_H,top=q.y-.9*ch,[bx0,by0,bx1,by1]=FIGURE[fx.pose]||FIGURE.walk,fw=(bx1-bx0)*q.w,fh=(by1-by0)*ch,fx0=q.x-q.w/2+bx0*q.w,fy0=top+by0*ch;
   const pts=scribblePath(fx.seed,fx0+fw*.14,fy0+fh*.08,fw*.72,fh*.6),n=Math.max(2,Math.ceil(pts.length*Math.min(1,fx.age/SCRIBBLE.draw)));
   for(const [d,w,a] of [[.8,1,.22],[0,1.7,.5]]){m.moveTo(pts[0][0]+d,pts[0][1]+d);for(let i=1;i<n;i++)m.lineTo(pts[i][0]+d,pts[i][1]+d);m.stroke({color:0x4b5163,width:w,alpha:a*fade,cap:'round',join:'round'})}}};
 // The radar's hills in her pen (owner 2026-10-29 polish): one ballpoint line with a faint second pass, inside the card's own
 // frame (the renderer's plain inner box is not drawn).
 r.radarInk=function(e){if(!this.scanLines)return;if(!this.radarG){this.radarG=this.scanLines;this.scanLines=new P.Graphics();this.scanLines.visible=false;this.radarG.parent.addChild(this.scanLines)}const g=this.radarG;const line=ScribbleScene.scanner(e,ScribbleScene.inkRect({x:0,y:0,w:this.W(),h:this.H()}).w).line;g.clear();if(line.length<2)return;
  for(const [dy,w,a] of [[.8,1.1,.3],[0,1.5,.9]]){g.moveTo(line[0][0],line[0][1]+dy);for(const p of line.slice(1))g.lineTo(p[0],p[1]+dy);g.stroke({color:0x2f5d3a,width:w,alpha:a,cap:'round',join:'round'})}};r.inkTags.visible=false;
 // The ground strips (owner 2026-10-29 polish): drawn at their own proportions, 21 tiles round the world, the solid grass
 // line on the terrain curve (the blade tips stand above it, behind the students).
 r.worldGround=function(e){const T=this.terrain;if(!T)return;T.visible=false;
  if(!this.groundTiles){const layer=new P.Container();T.parent.addChildAt(layer,T.parent.getChildIndex(T));this.groundTiles=[0,1,2,3,4].map(()=>{const m=new P.MeshPlane({texture:T.texture,verticesX:49,verticesY:4});layer.addChild(m);return m})}
  // While the planet is being lost the ground stays, crossed out, then fades with the scribble.
  const fade=e.planet?1:e.planetFx>0?1:Math.max(0,1-(e.clock-(planetGone.get(e)??e.clock))/.8),show=e.planet||fade>0;this.groundTiles[0].parent.alpha=fade;
  const tex=T.texture,f=tex.frame,TW=C.world/21,TH=TW*f.height/f.width,hn=[1,2,3].find(n=>this.frames['hill-'+n][0]===tex)||1,so=SOIL[hn],line=TH*(GRASS_LINE[hn]||.2),first=Math.floor((e.cam-C.width/2)/TW);
  this.groundTiles.forEach((m,j)=>{const k=first+j,ws=k*TW;m.visible=show&&ws<e.cam+C.width/2;if(!m.visible)return;
   if(m.texture!==tex)m.texture=tex;m.alpha=T.alpha;m.tint=T.tint;const pos=m.geometry.getBuffer('aPosition'),d=pos.data,uv=m.geometry.getBuffer('aUV'),u=uv.data;
   // Solid hills (core 0.7.0: peaks up to 221 px above the ground line): the grass and soil keep their own proportions, then
   // the soil's hatching reaches down at least to the ground line and fades into the paper below it, so no tall hill is hollow.
   for(let i=0;i<49;i++){const w=ws+i*TW/48,x=w-e.cam+C.width/2,y=groundAt(e,w)-line,r2=Math.max(y+TH*so[1],C.ground+22),r3=Math.max(y+TH,r2+TH*(1-so[1]));
    [y,y+TH*so[0],r2,r3].forEach((yy,row)=>{const k=row*49+i;d[k*2]=x;d[k*2+1]=yy;u[k*2]=i/48;u[k*2+1]=[0,so[0],so[1],1][row]})}pos.update();uv.update()});
  // The lower half of the grass blades again in front of everything on the ground (owner 2026-10-29: scenery and students
  // stand in the grass, not on top of it); the band fades in from its top so the blades in front have no hard edge.
  {const n=[1,2,3].find(k=>this.frames['hill-'+k][0]===tex)||1,gl=GRASS_LINE[n],v0=gl*.45,v1=gl+.05;
   if(!(this.frontTex??={})[n]){const src=tex.source.resource,c=document.createElement('canvas'),fw=2048,fh=Math.round(f.height*(v1-v0)*fw/f.width);c.width=fw;c.height=fh;const x=c.getContext('2d');
    x.drawImage(src,f.x,f.y+f.height*v0,f.width,f.height*(v1-v0),0,0,fw,fh);x.globalCompositeOperation='destination-in';const gr=x.createLinearGradient(0,0,0,fh);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.45,'#fff');gr.addColorStop(1,'#fff');x.fillStyle=gr;x.fillRect(0,0,fw,fh);this.frontTex[n]=P.Texture.from(c)}
   if(!this.frontGrass){this.frontGrass=new P.Container();this.frontTiles=[0,1,2,3,4].map(()=>{const m=new P.MeshPlane({texture:this.frontTex[n],verticesX:49,verticesY:2});this.frontGrass.addChild(m);return m})}
   if(!this.frontGrass.parent)this.world.addChild(this.frontGrass);if(this.world.children[0]!==this.backLayer)this.world.setChildIndex(this.backLayer,0);this.frontGrass.visible=e.planet;
   this.frontTiles.forEach((m,j)=>{const k=first+j,ws=k*TW;m.visible=show&&ws<e.cam+C.width/2;if(!m.visible)return;if(m.texture!==this.frontTex[n])m.texture=this.frontTex[n];const pos=m.geometry.getBuffer('aPosition'),d=pos.data;
    for(let i=0;i<49;i++){const w=ws+i*TW/48,x=w-e.cam+C.width/2,y=groundAt(e,w)-line;d[i*2]=x;d[i*2+1]=y+TH*v0;d[(49+i)*2]=x;d[(49+i)*2+1]=y+TH*v1}pos.update()})}
  if(!this.scribble){this.scribble=new P.MeshPlane({texture:this.frames['scribble-band'][0],verticesX:49,verticesY:2});this.groundTiles[0].parent.addChild(this.scribble);const c=document.createElement('canvas');c.width=1600;c.height=8;const x=c.getContext('2d'),gr=x.createLinearGradient(1440,0,1600,0);gr.addColorStop(0,'#fff');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,1600,8);this.scribbleFront=new P.Sprite(P.Texture.from(c));this.scribbleFront.height=780;this.groundTiles[0].parent.addChild(this.scribbleFront);this.scribble.mask=this.scribbleFront}
  // Her pen moves left to right; the front of the scribble is soft (a moving gradient mask), the scribble itself spans the page.
  const s=this.scribble,reveal=e.planet?0:Math.min(1,(1-e.planetFx/C.planetEffect)/.7);s.visible=this.scribbleFront.visible=show&&reveal>0;if(!s.visible)return;this.scribbleFront.x=20+1560*reveal-1440;
  // Lighter and partial (owner 2026-11-02, Ken Lobb's playtest: the band ended as a solid dark blot): the band at under half
  // strength and two thirds of its height, so the hills still show through her scribble before both fade.
  s.alpha=.42;const sh=.66*1400*this.frames['scribble-band'][0].frame.height/4096,sp=s.geometry.getBuffer('aPosition'),su=s.geometry.getBuffer('aUV'),sd=sp.data,ud=su.data;
  for(let i=0;i<49;i++){const x=20+1400*i/48,y=groundAt(e,e.cam+x-C.width/2)-sh*.42;sd[i*2]=x;sd[i*2+1]=y;sd[(49+i)*2]=x;sd[(49+i)*2+1]=y+sh;ud[i*2]=ud[(49+i)*2]=(x-20)/1400;ud[i*2+1]=0;ud[(49+i)*2+1]=1}sp.update();su.update()}}

// The cabinet's sounds: the notebook's recordings through the shared bus first, its own synthesis otherwise (and for thrust).
class Sounds{
 constructor(services){this.bus=services.audio;this.save=services.save;this.synth=g.ScribbleAudio?new g.ScribbleAudio():null;this.unattach=this.synth&&this.bus?.attach?.(this.synth)}
 on(){return this.bus&&this.save?.settings.sound!==false}
 unlock(){this.bus?.unlock?.();this.synth?.unlock()}
 // The laser 20% quieter (owner 2026-11-02, Ken Lobb's playtest): gain .8 for the shell's recording, the synth's own level in audio.js.
 event(e){if(!this.on())return;this.unlock();if(this.bus.gameSample?.(ID,e.type==='laser'?{...e,gain:.8}:e))return;this.synth?.event(e.type)}
 // Thrust: the notebook's looping recording while held; its own rumble only without one.
 thrusting(on){const want=!!on&&this.on();if(this.bus?.gameLoop?.(ID,'thrust-voice',want))this.synth?.thrusting(false);else this.synth?.thrusting(want)}
}

class DefenderGame{
 constructor(services,container,seed){this.services=services;this.container=container;this.seed=seed;this.mode='play';this.ai=false;this.paused=false;this.simPaused=false;this.acc=0;this.held={};this.pad={};this.sounds=new Sounds(services);
  this.effects=[];this.toast='';this.toastTime=0;this.reverseAge=999;this.reverseFrom=1}
 async init(){const P=g.PIXI;if(!P)throw Error('PixiJS is not available.');patchScene();
  const canvas=document.createElement('canvas');Object.assign(canvas.style,{width:'100%',height:'100%',display:'block'});this.container.appendChild(canvas);this.canvas=canvas;
  const r=new ScribbleRenderer(canvas,this.container);this.renderer=r;await r.init();dressRenderer(r,this.container);const app=r.app;this.app=app;
  const style=size=>({fontFamily:'Schoolhand, sans-serif',fontSize:size,fill:0x22355a,align:'center'});
  const text=size=>{const t=new P.Text({text:'',style:style(size)});t.anchor.set(.5);r.hud.addChild(t);return t};this.message=text(52);this.sub=text(30);
  this.onKey=e=>this.key(e,true);this.offKey=e=>this.key(e,false);addEventListener('keydown',this.onKey);addEventListener('keyup',this.offKey);this.onBlur=()=>{this.held={}};addEventListener('blur',this.onBlur);
  this.touch=g.No2TouchPad?.(this,canvas,W,H)||{fingers:new Map(),stick:()=>({x:0,y:0,d:0}),take:k=>k==='twos'?0:[]};this.attachZones();
  this.tracing=await g.No2Tracing?.attach(P,app,r.hud,{x:0,y:0,w:W,h:H,quiet:[this.message,this.sub]});
  this.newGame(this.seed);app.ticker.add(t=>this.frame(t.deltaMS/1000));app.ticker.start();return this}
 inputEnabled(){return !g.No2||g.No2.gameInputEnabled?.()!==false}
 key(e,down){if(!this.inputEnabled()){if(!down)this.held={};return}const k=e.key;if(down)this.sounds.unlock();/* a real key (not the shell's on-screen pad) hides the touch buttons */if(down&&e.isTrusted&&!e.repeat)this.lastInput='keys';
  // Initials: letters typed on the keyboard go straight in, so no letter moves or pauses here.
  if(this.mode==='initials'){if(down){e.preventDefault();if(!e.repeat||k.startsWith('Arrow'))this.edge(k)}return}
  if(down&&(k==='p'||k==='P')){this.pause();e.preventDefault();return}
  for(const [name,list] of Object.entries(KEYS))if(list.includes(k)){this.held[name]=down;if(down&&name==='fire')this.tap=true;if(down&&(name==='bomb'||name==='warp'))this[name+'Tap']=true;e.preventDefault()}
  if(down&&!e.repeat)this.edge(k)}
 // For a moment after the game ends a fire button still being mashed neither types initials nor restarts.
 edge(k){if(this.endHold>0)return;if(this.mode==='initials'){const it=this.initials,last=it.pos>=2;if(/^[a-z]$/i.test(k)){it.typed=true;it.letters[it.pos]=LETTERS.indexOf(k.toUpperCase());if(!last)it.pos++}else if(k==='Backspace'){it.pos=Math.max(0,it.pos-1)}else if(['ArrowUp','ArrowRight'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+1)%26;else if(['ArrowDown','ArrowLeft'].includes(k))it.letters[it.pos]=(it.letters[it.pos]+25)%26;else if(k===' '||k==='Enter'){if(k==='Enter'||last)this.saveScore();else it.pos++}}
  else if(this.mode==='over'&&(k===' '||k==='Enter'))this.newGame(this.services.again?.(this.seed)??this.seed+1)}
 // Controller (Xbox layout). Default, "triggers steer" (owner 2026-11-02 from Ken Lobb's playtest): LT flies left, RT flies
 // right (the trigger for the way she is not facing turns the ship, like the arrow keys), the stick or D-pad flies up and
 // down only, A fires (held, it keeps firing), X smart bomb, Y warps, Menu pauses. Classic (settings.defenderPad 'classic',
 // owner 2026-11-02 from a player: the cabinet's controls): stick up and down, RT thrusts, LT reverses.
 // Up and down follow the stick's deflection (the core flies at y times its vertical speed): a small dead zone and a gentle curve.
 padScheme(){const s=this.services.save?.settings?.defenderPad;return s==='classic'||s===true?'classic':'triggers'}
 readPad(){const pads=navigator.getGamepads?.()||[],i=g.No2Repairs?.padState?.index,p=(i!=null&&pads[i]?.connected?pads[i]:null)||[...pads].find(x=>x&&x.connected);const now={},was=this.pad;
  if(p&&this.inputEnabled()){const b=i=>!!p.buttons[i]?.pressed,v=i=>p.buttons[i]?.value||(b(i)?1:0),ax=p.axes[0]||0,ay=p.axes[1]||0,
    dz=.08,t=Math.hypot(ax,ay)<dz?0:Math.min(1,Math.max(0,(Math.abs(ay)-dz/2)/(.92-dz/2)));
   now.y=Math.max(-1,Math.min(1,Math.sign(ay)*t**1.3+(b(13)?1:0)-(b(12)?1:0)));now.fire=b(0);now.bomb=b(2);now.warp=b(3);now.pause=b(9);
   const lt=v(6),rt=v(7);
   // D-pad left and right fly that way in both layouts, like the arrow keys (player report 2026-11-06: the old version used
   // the D-pad, keep both). The stick shares those buttons past halfway (app.js mergePad), so only a push that is mostly
   // sideways counts: a diagonal up or down never turns the ship.
   const side=Math.abs(ax)>2*Math.abs(ay),dx=side?(b(15)?1:0)-(b(14)?1:0):0;
   if(this.padScheme()==='classic'){now.thrust=rt>.3;now.reverse=lt>.3;now.x=dx}
   else{// Either trigger past a light touch flies that way at full thrust (the core's thrust is on or off); both held, the last one pressed wins.
    now.lt=was.lt?lt>.06:lt>.12;now.rt=was.rt?rt>.06:rt>.12;if(now.lt&&!was.lt)this.lastTrigger=-1;if(now.rt&&!was.rt)this.lastTrigger=1;
    now.x=now.lt&&now.rt?(this.lastTrigger||1):now.rt?1:now.lt?-1:dx}
   now.up=b(12)||ay<-.5;now.down=b(13)||ay>.5;
   // The controller counts as the last thing used (hiding the touch zones) only on a button press or a real stick push:
   // a drifting stick just past the dead zone on a tablet's pad left them flickering off.
   const btns=p.buttons.map(x=>!!x?.pressed||(x?.value||0)>.3),was0=this.padBtns||[];this.padBtns=btns;
   if(btns.some((on,k)=>on&&!was0[k])||Math.hypot(ax,ay)>.3){this.sounds.unlock();this.lastInput='pad'}}
  else this.padBtns=[];
  if(now.pause&&!this.pad.pause)this.pause();
  if(this.mode==='initials'||this.mode==='over'){if(now.up&&!this.pad.up)this.edge('ArrowUp');if(now.down&&!this.pad.down)this.edge('ArrowDown');if(now.fire&&!this.pad.fire)this.edge(' ')}
  this.pad=now}
 // Fire counts only once it has been let go since play resumed, so the A that starts the page does not shoot.
 // Touch: the first finger is the stick (it flies the ship, which faces and thrusts the way it is pushed); a tap fires, a two-finger tap is the smart bomb.
 // With the touch zones on (see ZONE) the stick, taps and two-finger taps above are not read: the zones give x (an arrow
 // button turns and thrusts, as the arrow keys do), y (toward the thumb's mark) and fire (held, it keeps firing).
 input(){const pad=this.pad,h=this.held,z=this.zonesOn()?this.zoneInput():null;if(z){this.touch.take('presses');this.touch.take('twos')}
  const s=z||this.touch.stick(),fire=!!(h.fire||pad.fire||this.tap||z?.fire),out=this.inputRaw(pad,h,s,fire,!!z?.fire);this.tap=this.bombTap=this.warpTap=false;return out}
 // A key tapped between two steps (bomb, warp, like fire) still reaches the engine once.
 inputRaw(pad,h,s,fire,held=false){if(!fire)this.fireArmed=true;
  const cl=v=>Math.max(-1,Math.min(1,v)),x=cl((h.right?1:0)-(h.left?1:0)+(s.x||0)+(pad.x||0)),/* the controller turns the ship with its triggers (triggers steer) or the D-pad sideways (pad.x, both layouts) */y=cl((h.down?1:0)-(h.up?1:0)+(pad.y||0)+(s.y||0));
  return{x,y,fire:fire&&this.fireArmed||this.touch.take('presses').length>0,thrust:!!(h.thrust||pad.thrust),reverse:!!(h.reverse||pad.reverse),bomb:!!(h.bomb||pad.bomb||this.bombTap||this.touch.take('twos')>0),warp:!!(h.warp||pad.warp||this.warpTap),modern:true,autofire:!!(pad.fire||held)}}
 touchScheme(){const s=this.services.save?.settings?.defenderTouch;return s==='stick'||s===true?'stick':'zones'}
 // Shown and read while touch is the last thing used (or the shell says touch before anything is pressed), in real play.
 zonesOn(){if(this.touchScheme()==='stick'||this.ai||this.mode!=='play'||this.paused||this.simPaused)return false;return this.lastInput?this.lastInput==='touch':g.No2?.deviceMode==='touch'}
 // The buttons' centres in screen pixels, from the canvas's place on the screen (bottom right of the page).
 zoneButtons(){const r=this.canvas.getBoundingClientRect();if(!(r.width>0))return[];const R=Math.max(24,Math.min(ZONE.R,r.height*.1)),G=ZONE.gap*R,m=R*.45,
   fx=r.right-m-R-G,fy=r.bottom-m-R;return[{id:'fire',x:fx,y:fy,R},{id:'left',x:fx-G,y:fy,R},{id:'right',x:fx+G,y:fy,R},{id:'bomb',x:fx+G,y:fy-2.75*R,R:R*.85}]}
 zoneHits(x,y){return this.zoneButtons().filter(b=>Math.hypot(x-b.x,y-b.y)<=b.R*ZONE.hit).map(b=>b.id)}
 // The thumb's height on the screen to the ship's height in the field (both ends held a little in from the edges).
 zoneMark(cy){const vh=innerHeight||1,t=Math.max(0,Math.min(1,(cy/vh-ZONE.top)/(ZONE.bottom-ZONE.top))),lo=C.top+18,hi=C.ground-21;return lo+t*(hi-lo)}
 zoneInput(){const held=new Set();let thumb=null;for(const p of this.zones.values()){if(p.kind==='y')thumb=p;else for(const b of p.btns)held.add(b)}
  let x=0;if(held.has('left')&&held.has('right'))x=this.zoneDir||1;else if(held.has('right'))x=1;else if(held.has('left'))x=-1;
  let y=0;if(thumb){const d=this.zoneMark(thumb.cy)-this.engine.p.y;y=Math.abs(d)<.5?0:Math.max(-1,Math.min(1,d/ZONE.ease))}
  return{x,y,fire:held.has('fire'),held}}
 // Every window listener the game added, removed once (the adapter's close, a close during init, or init failing).
 dispose(){if(this.disposed)return;this.disposed=true;removeEventListener('keydown',this.onKey);removeEventListener('keyup',this.offKey);removeEventListener('blur',this.onBlur);this.detachZones();this.sounds.thrusting(false);this.sounds.unattach?.()}
 attachZones(){this.zones=new Map();this.lastInput=null;this.zoneDir=1;this.zoneAt=0;
  const mine=e=>(e.pointerType==='touch'||e.pointerType==='pen')&&!e.target?.closest?.('button,a,input,select,textarea,dialog,#touch-controls,#desk-dialog');
  const press=(p,ids)=>{for(const id of ids)if(!p.btns.has(id)){if(id==='bomb')this.bombTap=true;if(id==='left'||id==='right')this.zoneDir=id==='left'?-1:1;try{navigator.vibrate?.(10)}catch{}}p.btns=new Set(ids)};
  this.onZoneDown=e=>{if(!mine(e)||!this.inputEnabled())return;this.lastInput='touch';this.sounds.unlock();if(!this.zonesOn())return;this.zoneAt=performance.now();
   const hits=this.zoneHits(e.clientX,e.clientY);if(hits.length){const p={kind:'btn',btns:new Set()};press(p,hits);this.zones.set(e.pointerId,p)}
   else if(e.clientX<(innerWidth||1)*ZONE.left)this.zones.set(e.pointerId,{kind:'y',cy:e.clientY})};
  // A thumb slides from button to button (or rocks onto two at once); the height thumb follows anywhere on the screen.
  this.onZoneMove=e=>{const p=this.zones.get(e.pointerId);if(!p)return;if(p.kind==='y')p.cy=e.clientY;else press(p,this.zoneHits(e.clientX,e.clientY))};
  this.onZoneUp=e=>{if(this.zones.delete(e.pointerId))this.zoneAt=performance.now()};this.onZoneBlur=()=>this.zones.clear();
  addEventListener('pointerdown',this.onZoneDown);addEventListener('pointermove',this.onZoneMove);addEventListener('pointerup',this.onZoneUp);addEventListener('pointercancel',this.onZoneUp);addEventListener('blur',this.onZoneBlur)}
 detachZones(){removeEventListener('pointerdown',this.onZoneDown);removeEventListener('pointermove',this.onZoneMove);removeEventListener('pointerup',this.onZoneUp);removeEventListener('pointercancel',this.onZoneUp);removeEventListener('blur',this.onZoneBlur);this.zones?.clear()}
 // Her ink buttons on the page (blue ballpoint circles with a faint second pass, a wash while pressed) and the height
 // guide down the left margin with the thumb's mark; in screen pixels converted to the game's 1440-wide space.
 drawZones(show){const P=g.PIXI,r=this.renderer;if(!this.zoneG){this.zoneG=new P.Graphics();r.hud.addChild(this.zoneG);this.zoneText={};for(const [id,w] of [['fire','fire'],['bomb','bomb'],['left','thrust'],['right','thrust']]){const t=new P.Text({text:w,style:{fontFamily:'Schoolhand, sans-serif',fontSize:26,fill:0x1b3591,align:'center'}});t.anchor.set(.5);r.hud.addChild(t);this.zoneText[id]=t}}
  const gz=this.zoneG,texts=Object.values(this.zoneText);gz.clear();const rect=this.canvas.getBoundingClientRect();
  if(!show||!(rect.width>0)){for(const t of texts)t.visible=false;if(!show)this.zones.clear();return}
  for(const t of texts)t.visible=true;keepLast(r.hud,[gz,...texts]);
  const sx=v=>(v-rect.left)/rect.width*W,sy=v=>(v-rect.top)/rect.height*H,k=rect.width/W,lw=n=>n/k,
   held=new Set();let thumb=null;for(const p of this.zones.values()){if(p.kind==='y')thumb=p;else for(const b of p.btns)held.add(b)}
  // Idle for 4 s the buttons fade back (like the shell's pad), solid while pressed.
  const idle=performance.now()-this.zoneAt>4000&&!this.zones.size,base=idle?.35:.6,ink=0x1b3591,px=n=>Math.max(n*view.u,n*.55)/view.k;
  const ring=(x,y,R,seed,alpha)=>{for(const [d,w,a] of [[.9,1.3,.3],[0,2.6,1]]){for(let i=0;i<=40;i++){const ang=i/40*Math.PI*2+seed,rr=R*(1+.035*Math.sin(3*ang+seed*5)+.02*Math.sin(7*ang+seed))+(i>36?(i-36)*.6:0);const X=x+Math.cos(ang)*rr+d,Y=y+Math.sin(ang)*rr+d;i?gz.lineTo(X,Y):gz.moveTo(X,Y)}gz.stroke({color:ink,width:lw(w),alpha:a*alpha,cap:'round',join:'round'})}};
  for(const [i,b] of this.zoneButtons().entries()){const x=sx(b.x),y=sy(b.y),R=b.R/k,on=held.has(b.id),a=on?1:base;
   /* a paper wash under each so the word reads over the hills, a blue one while pressed */gz.circle(x,y,R*.97).fill({color:on?0x6f8fd8:0xfbf1d9,alpha:on?.35:.55*a});ring(x,y,R,i*1.7+.4,a);const t=this.zoneText[b.id];t.alpha=Math.min(1,a+.25);t.style.fontSize=Math.min(px(26),R*.5);
   if(b.id==='left'||b.id==='right'){const s=b.id==='left'?-1:1,cw=R*.26,cy=y-R*.22;gz.moveTo(x-s*cw*.6,cy-cw).lineTo(x+s*cw*.6,cy).lineTo(x-s*cw*.6,cy+cw).stroke({color:ink,width:lw(2.8),alpha:a,cap:'round',join:'round'});t.position.set(x,y+R*.32)}else t.position.set(x,y)}
  // The height guide: a faint pen line down the left margin, its ends where the thumb's 12% and 88% put the ship.
  const gx=sx(Math.max(rect.left,0)+14),lo=C.top+18,hi=C.ground-21;gz.moveTo(gx,lo).lineTo(gx,hi).stroke({color:ink,width:lw(1.4),alpha:base*.6,cap:'round'});
  for(const yy of [lo,hi])gz.moveTo(gx-lw(5),yy).lineTo(gx+lw(5),yy).stroke({color:ink,width:lw(1.4),alpha:base*.6,cap:'round'});
  if(thumb){const m=this.zoneMark(thumb.cy);gz.circle(gx,m,lw(6)).stroke({color:ink,width:lw(2),alpha:.9});gz.moveTo(gx+lw(9),m).lineTo(gx+lw(22),m).stroke({color:ink,width:lw(2),alpha:.5,cap:'round'})}}
 newGame(seed=this.seed){this.seed=seed;this.engine=new ScribbleCore.ScribbleEngine(seed);this.rec=g.No2Leaderboard?.recorder(ID,seed,ScribbleCore)||null;this.paused=false;this.effects=[];this.humanWas=new WeakMap();this.toast='';this.toastTime=0;this.reverseAge=999;if(this.mode!=='demo')this.mode='play';this.initials=null;this.engine.events.splice(0)}
 pause(){if(this.mode==='play'||this.mode==='demo')this.paused=!this.paused;if(this.paused)this.sounds.thrusting(false)}
 frame(dt){dt=Math.min(dt,.1);if(this.endHold>0)this.endHold-=dt;this.readPad();const e=this.engine;
  if(!this.paused&&!this.simPaused&&this.mode!=='initials'&&this.mode!=='over'){this.acc+=dt;let n=0;while(this.acc>=C.step&&n<24){let input=this.ai?e.pilot():this.input();if(this.rec)input=this.rec.take(input,this.mode==='play'&&!this.ai,e);e.step(C.step,input);this.acc-=C.step;n++;this.drain()}
   this.sounds.thrusting(e.p.thrusting&&e.state==='play'&&!this.ai);this.reverseAge+=dt;for(const fx of this.effects)fx.age+=dt;this.effects=this.effects.filter(fx=>fx.age<fx.duration);if(e.state==='end')this.endGame()}
  else{this.acc=0;this.sounds.thrusting(false)}
  this.toastTime-=dt;this.render()}
 drain(){const e=this.engine,live=this.mode==='play'&&!this.ai;for(const ev of e.events.splice(0)){this.sounds.event(ev);
   if(ev.type==='reverse'){this.reverseAge=0;this.reverseFrom=-e.p.dir}
   if(ev.type==='kill'){this.effects.push({id:ev.enemyType?ev.enemyType+'-death':'scribble-burst-1',x:ev.x,y:ev.y,age:0,duration:.48,fps:18,flip:facingAt(ev.enemyType,ev.x,ev.y)});e.popups.push({x:ev.x,y:ev.y-48,text:Math.floor(ev.x)%2?'POW':'BOOM',t:.45,comic:true})}
   if(ev.type==='saved')e.popups.push({x:ev.x,y:ev.y-28,text:'thx',t:1});
   const copy={wave:'wave '+e.wave,falling:'catch them',mutant:'mutant',planet:'MUTANT PLANET',baiter:'this guy again.',extra:'extra ship + bomb',saved:'thx.',respawn:'ready'}[ev.type];if(copy){this.toast=copy;this.toastTime=2.6}
   // Tiny victories: Scribble Defender's are counted from save.record (victories.js watches it).
   if(live&&['death','gameover','tally','saved','kill'].includes(ev.type))this.services.save?.record(ID,ev.type,{...ev,score:e.score})}
  // A student lost (shot, dropped, carried off the top, or with the ship) is scribbled out where they were: her light pencil
  // scribble over the figure, then both fade (owner 2026-11-02, Ken Lobb's playtest; the core removes them with no event).
  for(const h of e.humans){const was=this.humanWas.get(h);if(was&&was!=='dead'&&h.state==='dead'&&e.onScreen(h.x,-60))
    this.effects.push({human:true,variant:h.variant,pose:was==='abducted'||was==='carried'?'struggle':was==='falling'?'fall':'walk',ground:was==='ground',depth:h.depth||0,carried:was==='carried',x:h.x,y:h.y,frame:was==='ground'?Math.floor(ScribbleCore.wrap(h.x)/3.5):Math.floor(e.clock*10),flip:was==='ground'&&Math.sin(e.clock*.5+h.variant)<0,seed:h.id*977+Math.floor(e.clock*60),age:0,hold:SCRIBBLE.hold,duration:SCRIBBLE.duration});
   this.humanWas.set(h,h.state)}}
 endGame(){this.sounds.thrusting(false);if(this.mode==='demo'){this.newGame(this.seed+1);return}this.endHold=.9;const score=this.engine.score,save=this.services.save,rows=g.No2Scores.rows(save,ID,this.seed);
  if(score>0&&(rows.length<10||score>rows[rows.length-1].score)){this.mode='initials';this.initials={letters:[0,0,0],pos:0,score}}else{this.mode='over';g.No2Leaderboard?.finish(save,ID,this.rec,this.engine)}}
 saveScore(){const save=this.services.save,it=this.initials,name=it.letters.map(i=>LETTERS[i]).join('');g.No2Scores.add(save,ID,this.seed,name,it.score);g.No2Leaderboard?.finish(save,ID,this.rec,this.engine,name);this.mode='over';this.initials=null}
 render(){const r=this.renderer,e=this.engine;if(r.W()!==this.lastW||r.H()!==this.lastH){this.lastW=r.W();this.lastH=r.H();r.resize()}
  const w=this.canvas.getBoundingClientRect().width;view.u=Math.min(innerWidth/1920,innerHeight/1080);view.k=Math.max(.2,(w||W)/W);
  const pad=g.No2?.deviceMode==='xbox';let msg='',sub='';
  if(this.mode==='initials'){const it=this.initials;msg='new high score!';sub='your initials:  '+it.letters.map((x,i)=>i===it.pos?'['+LETTERS[x]+']':i<it.pos||it.typed?LETTERS[x]:'_').join(' ')}
  else if(this.mode==='over'){msg='final grade.';sub=''}
  const best=Math.max(g.No2Scores.best(this.services.save,ID,this.seed)||0,this.mode!=='demo'?e.score:0)/* the run's own score stays the best under the initials sheet, as in play */;
  view.quiet=!!msg;r.render(e,{mode:'play',settings:{post:true,vignette:true,lighting:false,shake:1,reduced:!!this.services.save?.settings.reduced},best,debug:false,fps:60,toast:this.toast,toastTime:this.toastTime,effects:this.effects,reverseAge:this.reverseAge,reverseFrom:this.reverseFrom,noPresent:true});
  // Tracing paper over the field while a message holds play.
  this.tracing?.show(!!msg);this.message.text=msg;this.sub.text=sub;
  this.drawZones(!msg&&this.zonesOn());
  const px=n=>Math.max(n*view.u,n*.55)/view.k;this.message.style.fontSize=px(52);this.sub.style.fontSize=px(30);this.message.position.set(W/2,H/2-px(30)*.7);this.sub.position.set(W/2,H/2+px(52)*.55);
  // Canvas text in screen pixels for tools/ui-audit.mjs.
  g.No2CanvasText=()=>!(this.canvas.getBoundingClientRect().width>0)?[]:[...lastTexts.filter(t=>t.text&&t.alpha!==0).map(t=>({text:String(t.text),size:+(t.size*view.k).toFixed(1)})),...[this.message,this.sub].filter(t=>t.text).map(t=>({text:t.text,size:+(t.style.fontSize*view.k).toFixed(1)}))]}
}

class DefenderAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.game=null;this.suspended=false;this.inPage=true;this.aspect=[W,H];this.lastClose=null}
 async mount(container,seed=1981){if(this.api)return this.api;const frame=document.createElement('div');frame.id='defender-stage';frame.dataset.notebook=ID;Object.assign(frame.style,{position:'absolute',inset:'0'});container.appendChild(frame);this.frame=frame;
  let game=null;
  try{game=new DefenderGame(this.services,frame,seed);await game.init();if(this.frame!==frame){game.dispose();game.app.destroy(true,{children:true,texture:true});return null}this.game=game;
   const api={get:()=>({mode:game.mode==='demo'?'demo':'play',paused:game.paused,...game.engine.snapshot()}),newGame:s=>game.newGame(s),setMode:m=>{game.mode=m==='demo'?'demo':'play'},setAI:on=>{game.ai=!!on},pause:()=>game.pause(),render:()=>game.render(),setSimulationPaused:on=>{game.simPaused=!!on},
    tests:{run:()=>RULES.runDeterministicTests()},audio:{thrusting:on=>game.sounds.thrusting(on)},game,renderer:game.renderer};
   Object.defineProperty(api,'engine',{configurable:true,get:()=>game.engine});this.api=api;return api}
  catch(error){if(game&&this.game!==game){game.dispose();try{game.app?.destroy(true,{children:true,texture:true})}catch{}}await this.destroy();throw error}}
 suspend(){if(!this.game||this.suspended)return;this.game.simPaused=true;this.game.sounds.thrusting(false);this.suspended=true}
 resume(){if(!this.game)return;this.game.simPaused=false;this.game.fireArmed=false;this.game.tap=false;this.suspended=false}
 async destroy(){const game=this.game,frame=this.frame;this.game=null;this.api=null;this.frame=null;this.suspended=false;let textures=0;
  if(game){game.dispose();
   try{textures=Object.keys(game.renderer.textures).length;game.app.destroy(true,{children:true,texture:true,textureSource:true})}catch(e){console.warn('Notebook close:',e.message)}}
  frame?.remove();this.lastClose={destroyedAssetTextures:textures,frameRemoved:!!frame}}
 // For the shell (owner 2026-11-02 experiment): true while Scribble Defender plays by its own touch zones, so the on-screen
 // controller stays hidden; settings.defenderTouch 'stick' brings back the controller and the old finger stick.
 touchDirect(){const v=this.services.save?.settings?.defenderTouch;return !(v==='stick'||v===true)}
 memory(){return this.game?{active:true,assetTextures:Object.keys(this.game.renderer.textures).length}:{active:false,assetTextures:0,lastClose:this.lastClose}}
}
g.No2Defender={Adapter:DefenderAdapter,Game:DefenderGame};
})(globalThis);
