
(function(g){
'use strict';
// Locker hub: one painted image of her open school locker. The notebooks on the middle shelf,
// the stack below it, the sketchbook, the pencil case and the things taped inside the door are hotspots over the
// painting. It keeps the ClassroomRenderer interface the shell (src/shell/host.js) already calls.
const $=id=>document.getElementById(id);
const IW=5504,IH=3072,PER_SET=10;
// Hotspots in the painting's own pixels (art: incoming/UI3/hub-locker-full-v3.png, 5504x3072).
// Measured on the painting: left and right edge of each labelled spine's face, top and bottom of the face.
// Each set of ten has its own painted shelf (composition notebooks in their cover colours); spine edges measured per set.
const SET_SPINES=[[[1296, 1433], [1440, 1582], [1584, 1713], [1715, 1837], [2008, 2147], [2152, 2296], [2302, 2435], [2440, 2545], [2551, 2667], [2673, 2750]], [[1296, 1449], [1449, 1588], [1588, 1726], [1728, 1864], [1868, 2008], [2012, 2149], [2152, 2296], [2302, 2432], [2437, 2545], [2548, 2667]], [[1296, 1438], [1447, 1582], [1585, 1709], [1713, 1857], [1864, 2003], [2008, 2147], [2152, 2296], [2302, 2432], [2437, 2545], [2548, 2667]]].map(set=>set.map(([x0,x1])=>({x:x0,y:995,w:x1-x0,h:960})));
const SPINES=SET_SPINES[0];
const PROPS={
  intro:{x:1317,y:20,w:648,h:609,label:'the sketchbook'},
  eraser:{x:2040,y:530,w:265,h:110,label:'erase scores'},
  backpack:{x:1300,y:2100,w:1180,h:972,label:'more notebooks'},
  cast:{x:2930,y:170,w:410,h:930,label:"who's who"},
  achievements:{x:3850,y:1160,w:340,h:810,label:'achievements'},
  scores:{x:3110,y:1140,w:690,h:930,label:'high scores'},
  calculator:{x:3760,y:530,w:510,h:510,label:'arcade total'},
  settings:{x:2385,y:460,w:135,h:170,label:'settings'},
  // The swap sticker collection: her door's stickers are the five swap stickers, an empty die-cut spot
  // until each is earned; any of them opens the collection.
  stickers:{x:3040,y:2085,w:590,h:520,label:'sticker collection'},
  // The Walkman behind the pencil pouch: mixtapes.
  walkman:{x:2030,y:20,w:380,h:440,label:'mixtapes'},
  // The desk globe on the top shelf: the language.
  globe:{x:2570,y:240,w:300,h:410,label:'language'},
  // The detention slip: write up a problem. Taped on the door among the stickers
  // (in place of the index card, larger; the ball's compartment keeps only the ball and the sneaker).
  report:{x:3626,y:2150,w:460,h:515,label:'write it up'},
  // The volleyball behind her sneaker (easier to see and choose than the sneaker) opens the gym report.
  shoe:{x:2440,y:2430,w:305,h:300,label:'gym report'},
  // The tear-off calendar page on the door: today's daily challenge.
  daily:{x:3330,y:570,w:270,h:350,label:'daily challenge'},
  // The handle of the locker to the right: Ace's locker, the hard mode, once it is open.
  ace:{x:4880,y:1440,w:190,h:690,label:"Ace's locker"}
};
// Ace's locker: the same frame painted with his things (assets/ui/locker-ace.webp, tools/pack-ace.py);
// each prop opens the same page as hers, its notebooks play the hard mode, and her locker on the left takes you back.
const ACE_PROPS={
  intro:{x:1320,y:20,w:620,h:600,label:'his sketchbook'},
  walkman:{x:1970,y:150,w:780,h:370,label:'mixtapes'},
  settings:{x:1890,y:540,w:400,h:90,label:'settings'},
  eraser:{x:2290,y:580,w:130,h:80,label:'erase scores'},
  cast:{x:2940,y:420,w:320,h:670,label:"who's who"},
  daily:{x:3310,y:560,w:390,h:540,label:'daily challenge'},
  calculator:{x:3760,y:530,w:520,h:470,label:'arcade total'},
  scores:{x:3100,y:1150,w:680,h:890,label:'high scores'},
  achievements:{x:3870,y:1170,w:270,h:850,label:'achievements'},
  backpack:{x:1320,y:2100,w:620,h:972,label:'more notebooks'},
  // His skateboard, not the high-top in front of it, opens the gym report.
  shoe:{x:1950,y:2080,w:460,h:540,label:'gym report'},
  report:{x:2410,y:2260,w:350,h:420,label:'write it up'},
  home:{x:200,y:300,w:850,h:2500,label:'back to my locker'}
};
// The stickers on her door: a click plays the sound of the game each one comes from, from the games' own
// recordings: the rocket Scribble Defender's laser, the ghost Snack-Man eating an administrator, the invaders a shot and a hit;
// spread round the slip with a few more: the rock Erasteroids' explosion, the frog Froggology's hop and
// the paddle Gym Class Pong's hit.
// His stickers spread over the door with three more (his index card taken off): a cassette rewinding,
// an amp switched on into feedback, a hissing cat.
const ACE_STICKERS=[{x:3067,y:2098,w:215,h:279,sfx:'ace-skull'},{x:3318,y:2105,w:144,h:222,sfx:'ace-bolt'},{x:3082,y:2370,w:301,h:244,sfx:'ace-guitar'},{x:3390,y:2284,w:200,h:279,sfx:'ace-horns'},
  {x:3655,y:2126,w:265,h:215,sfx:'ace-cassette'},{x:3648,y:2406,w:222,h:215,sfx:'ace-amp'},{x:3941,y:2399,w:287,h:279,sfx:'ace-cat'}];
// The five swap sticker spots on her door (in place of the seven painted stickers, painted out by the
// approved edit assets/ui/stickers/door-bare.webp): painting coordinates, height h (the width follows the art), a tilt, and
// the recording each sticker plays when clicked (the same one it plays in its game, see AudioBus.STICKER_SFX).
// Her door's five spots (five favourites, chosen in the sticker collection, g.No2DoorStickers). Each spot keeps
// its place, size and tilt; a sticker brings its own sound. A spot with no sticker shows the outline of one still to earn.
const DOOR_STICKERS=[{id:'pizza',x:3055,y:2100,h:215,r:-.09,sfx:'snack-man/ghost-eaten'},{id:'pencils',x:3255,y:2090,h:205,r:.07,sfx:'space-substitutes/shot'},
  {id:'calculators',x:3080,y:2380,h:200,r:-.05,sfx:'galgebra/extra'},{id:'bomb',x:3330,y:2335,h:215,r:.06,sfx:'scribble-defender/bomb'},{id:'pepper',x:3460,y:2105,h:200,r:-.07,sfx:'home-ec-scramble/pepper'}];
// The backpack's peek frame (tools/pack-bag-peek.py: the whole green notebook lifts, its lower right too).
const BAG_PEEK={x:1646,y:2041,w:850,h:658};
// Open notebook: a two-page spread over the dimmed locker; for play the notebook turns a quarter
// (spiral on top) and the game fills one wide page. Rects in the plates' own pixels (5504x3072).
const SPREAD={left:{x:1130,y:330,w:1470,h:2290},content:{x:3090,y:420,w:1330,h:2120},tabs:[[990,1410],[1550,1960],[2100,2510],[3040,3460],[3600,4010]].map(([a,b])=>({x:a,y:2735,w:b-a,h:165}))};
// The play page is one page of the same composition notebook (9.75 x 7.5 in) turned a quarter; the view moves closer.
const PLAY={page:{x:1660,y:740,w:2300,h:1640},view:{x:1150,y:440,w:3250,h:2380},tabs:[[1595,2020],[2079,2503],[2567,2991],[3053,3477],[3536,3960]].map(([a,b])=>({x:a,y:2600,w:b-a,h:150}))};
// Each notebook has its own coloured marble cover (by catalog order), the same in both views.
const COVERS=['blue','red','green','purple','orange','teal','pink','black'];
// Whole pages (plate pixels): the notebook's paper type is laid onto them; on the turned page it turns with the notebook.
const PAGES={spread:[{x:930,y:265,w:1700,h:2420},{x:2870,y:265,w:1720,h:2420}],turned:{x:1477,y:504,w:2547,h:1981}};

// The turned page's flat paper (plate pixels, measured on nb-play-*: every cover colour shares the same page) and the
// outline of its curled bottom-left corner, top to bottom; curlX(y) is how far right the curl reaches above y.
// The open spread's two pages for the page turn (plate pixels): each reaches to the spine; OUTLINE is the top sheet's own edge,
// with the dog-eared corners cut along their fold (right page top right and bottom right, left page top left).
const SPINE=2750,LEAF=[{x:925,y:268,w:SPINE-925,h:2462},{x:SPINE,y:268,w:4612-SPINE,h:2462}];
const OUTLINE=[[[SPINE,278],[1088,278],[1040,305],[995,345],[958,392],[934,440],[934,2724],[SPINE,2724]],
 [[SPINE,278],[4413,278],[4470,318],[4528,382],[4572,440],[4607,512],[4607,2543],[4560,2585],[4500,2640],[4440,2690],[4384,2724],[SPINE,2724]]];
const FLAT={l:1522,r:4002,t:516,b:2462},PAGE_EDGE=2500;
const CURL=[[1472,1980],[1490,2050],[1560,2130],[1640,2180],[1720,2202],[1770,2210],[1795,2218],[1817,2255],[1820,2290],[1825,2370],[1840,2420],[1865,2465],[1915,2497]];
function curlX(y){if(y<CURL[0][1])return 0;for(let i=1;i<CURL.length;i++){const[x0,y0]=CURL[i-1],[x1,y1]=CURL[i];if(y<=y1)return x0+(x1-x0)*(y-y0)/(y1-y0)}return CURL[CURL.length-1][0]}

function loadImage(name){const src=g.LocalImages&&g.LocalImages[name];if(!src)return Promise.reject(Error('Missing image '+name));const i=new Image();i.src=src;return i.decode().then(()=>i)}

class LockerRenderer{
  constructor(canvas,assets){this.oldCanvas=canvas;this.assets=assets;this.paperFrames=new Map();this.app=null;this.canvas=null;this.selected=null;this.busy=false;this.openBook=null;this.key='';this.lift=null;this.set=0;this.pressUntil=0;this.dim=0}
  async init(){
    if(this.oldCanvas)this.oldCanvas.style.display='none';
    const c=this.canvas=document.createElement('canvas');c.id='locker-canvas';
    Object.assign(c.style,{position:'fixed',left:'0',top:'0',width:'100vw',height:'100vh',zIndex:'0',display:'block'});
    document.body.prepend(c);this.app={canvas:c};
    this.label=document.createElement('div');this.label.id='locker-note';
    Object.assign(this.label.style,{position:'fixed',zIndex:'8',pointerEvents:'none',fontFamily:'Hand,Schoolhand',color:'#243543',textAlign:'center',lineHeight:'1.1',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',overflow:'hidden',transform:'rotate(4deg)'});
    document.body.append(this.label);
    // Esc goes back to the title screen (no on-screen slip).
    const toTitle=()=>{const n=g.No2;if(!n||this.openBook||this.busy||n.intro?.active||$('desk-dialog')?.open||document.body.dataset.view!=='hub')return false;if(this.ace){this.leaveAce();return true}/* Esc in Ace's locker goes back to hers */n.intro.start(false);return true};// Only an Escape nothing else used (closing a dialog or the bag prevents its default first) goes back to the title.
    window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented&&!e.repeat&&toTitle())e.preventDefault()});
    const imgs=await Promise.all(['env/locker-1.png','env/locker-2.png','env/locker-3.png','env/locker-letters-1.png','env/locker-letters-2.png','env/locker-letters-3.png','env/locker-bag-peek.png'].map(loadImage));
    this.arts=imgs.slice(0,3);this.letters=imgs.slice(3,6);this.bagPeekArt=imgs[6];this.covers=new Map();
    // The pulled-out frames load after the locker is up; until one has, choosing that thing shows nothing extra.
    this.pulls={};loadImage('env/locker-pull-shoe-front.png').then(i=>{this.shoeFront=i},()=>{});loadImage('env/locker-pull-ball.png').then(i=>{this.ballSprite=i},()=>{});loadImage('env/locker-globe-map.png').then(im=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const q=c.getContext('2d');q.drawImage(im,0,0);this.globeMap={w:im.width,h:im.height,d:q.getImageData(0,0,im.width,im.height).data}},()=>{});loadImage('env/locker-globe-rim.png').then(im=>{this.globeRim=im},()=>{});for(const k of Object.keys(g.LockerPull||{}).filter(k=>k!=='labels'&&k!=='globe3d'))loadImage('env/locker-pull-'+k+'.png').then(i=>{this.pulls[k]=i;if(this.lift===k)this.draw()},()=>{});
    // The backpack's other notebooks: until it has been opened once, a notebook rises out of it a
    // little after you arrive and again whenever the locker sits idle; never with reduced motion.
    try{this.bagSeen=localStorage.getItem('No2Arcade:bag-seen')==='1'}catch{this.bagSeen=false}
    this.nudgeAt=0;this.nudgeT=-1;this.activeAt=performance.now();
    for(const ev of ['keydown','pointerdown','pointermove'])addEventListener(ev,()=>{this.activeAt=performance.now()},{passive:true});
    setInterval(()=>{const now=performance.now(),idle=this.lockerIdle();if(!idle){this.nudgeAt=this.nudgeAt||now;return}
      const first=!this.nudged,wait=first?2500:20000;if(this.bagSeen||this.nudgeT>=0||g.No2?.services?.save?.settings?.reduced)return;
      if(now-this.nudgeAt>=wait&&now-this.activeAt>(first?2500:8000))this.nudge()},500);
    document.body.classList.add('locker-hub');const st=document.createElement('style');st.textContent=LOCKER_CSS+(g.No2HeadingCSS||'');document.head.append(st);
    const dlg=$('desk-dialog');if(dlg)new MutationObserver(()=>{this.paintNote();if(dlg.open){const ru=document.getElementById('action-ruler');if(ru){ru.dataset.dx=0;ru.style.removeProperty('translate')}}}).observe(dlg,{attributes:true,attributeFilter:['open']});
    addEventListener('pointermove',e=>{this.pointerLow=e.clientY>innerHeight*.88});
    setInterval(()=>{if(!this.openBook||!this.playView()){this.peek=0;document.body.classList.remove('tabs-hidden');return}
      const a=g.No2?.adapter,paused=!!(a?.suspended||a?.api?.get?.()?.paused),want=paused||this.pointerLow?1:0,was=this.peek||0;
      this.peek=was+Math.max(-.25,Math.min(.25,want-was));document.body.classList.toggle('tabs-hidden',this.peek<.6);
      if(this.peek!==was){this.draw();this.layoutPages(a?.aspect||[1440,780])}},50);
    new MutationObserver(()=>{if(this.openBook&&!this.busy){this.draw();g.No2?.services&&this.layoutPages(g.No2.adapter?.aspect||[1440,780])}}).observe(document.body,{attributes:true,attributeFilter:['data-view']});
    this.gate={setGlance(){},clearLabel:()=>{},notifyInput(){},focus(){},label:this.label};
    g.No2HubHelpDevice=d=>{this.device=d;this.paintNote()};
    c.addEventListener('pointermove',e=>{if(this.blocked()||(e.pointerType!=='mouse'&&this.phoneZoom()))return;const id=this.pick(e);if(id)$('desk-'+id)?.focus({preventScroll:true})});
    c.addEventListener('click',e=>{if(performance.now()<(this.noClickUntil||0))return;/* a click on the dimmed locker beside the open spread closes the notebook, like Esc */if(this.openBook&&!this.busy&&!this.playView()&&!$('desk-dialog')?.open){const v=this.view(),px=(e.clientX-v.x)/v.s,py=(e.clientY-v.y)/v.s;if(px<900||px>4620||py<240||py>2920)g.No2?.close?.();return}if(this.blocked())return;const id=this.pick(e);if(id){$('desk-'+id)?.click();return}const v=this.view(),px=(e.clientX-v.x)/v.s,py=(e.clientY-v.y)/v.s;if(this.ace){/* his stickers: a fire burst, a lightning crack, a guitar chord, a cheer */const st=ACE_STICKERS.find(q=>px>=q.x&&px<=q.x+q.w&&py>=q.y&&py<=q.y+q.h);if(st){const a=g.No2?.services?.audio;a?.unlock?.();a?.foley?.(st.sfx)}return}});
    // Phone gestures on the locker: drag to look round the shelves (with a little glide after a flick),
    // pinch to come closer or step back, and a sideways swipe that starts on the notebooks brings the next or previous set.
    {const pts=new Map();let start=null,mode=null,pinch0=null,vel={x:0,y:0},lastT=0;
      const live=()=>this.phoneZoom()&&!this.blocked();
      // The hotspot buttons lie over the canvas, so the gestures are read at the window: a touch that starts on the canvas
      // or on any hotspot (a notebook, a prop) counts.
      const onHub=t=>t===c||!!t?.closest?.('.book-button,.prop-button');
      addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||!live()||!onHub(e.target))return;cancelAnimationFrame(this.glide);this.touching=true;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(pts.size===1){const r=this.regions().find(r=>{const b=r.bounds;return e.clientX>=b.x&&e.clientX<=b.x+b.w&&e.clientY>=b.y&&e.clientY<=b.y+b.h});start={x:e.clientX,y:e.clientY,t:performance.now(),onBook:!!r?.notebook};mode=null;vel={x:0,y:0};lastT=start.t}
        else if(pts.size===2){const [a,b]=[...pts.values()];pinch0={d:Math.hypot(a.x-b.x,a.y-b.y)||1,z:this.zoom??1};mode='pinch'}},true);
      addEventListener('pointermove',e=>{const p=pts.get(e.pointerId);if(!p||!live())return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
        if(mode==='pinch'&&pts.size===2){const [a,b]=[...pts.values()],fill=Math.max(innerWidth/3400,innerHeight/3072),fit=Math.min(innerWidth/3400,innerHeight/3072);this.zoom=Math.max(fit/fill,Math.min(2,pinch0.z*Math.hypot(a.x-b.x,a.y-b.y)/pinch0.d));this.clampPan();this.redrawPan();return}
        if(!start)return;const tx=e.clientX-start.x,ty=e.clientY-start.y;
        if(!mode&&Math.hypot(tx,ty)>10)mode=start.onBook&&this.sets()>1&&Math.abs(tx)>Math.abs(ty)*1.3?'set':'pan';
        if(mode==='pan'){this.panBy(dx,dy);const t=performance.now(),dt=Math.max(1,t-lastT);vel={x:dx/dt,y:dy/dt};lastT=t}},true);
      const end=e=>{if(!pts.delete(e.pointerId))return;if(mode)this.noClickUntil=performance.now()+400;
        if(mode==='set'&&start&&e.type==='pointerup'){const tx=e.clientX-start.x;if(Math.abs(tx)>40){Promise.resolve(tx<0?this.openBag():this.prevSet()).then(to=>to&&setTimeout(()=>$('desk-'+to)?.focus({preventScroll:true}),60))}}
        if(mode==='pan'&&pts.size===0&&performance.now()-lastT<80&&Math.hypot(vel.x,vel.y)>.3){let vx=vel.x*16,vy=vel.y*16;const fl=()=>{if(this.blocked())return;vx*=.92;vy*=.92;this.panBy(vx,vy);if(Math.hypot(vx,vy)>.5)this.glide=requestAnimationFrame(fl)};this.glide=requestAnimationFrame(fl)}
        if(pts.size===0){start=null;mode=null;this.touching=false}else if(mode==='pinch'&&pts.size===1)start=null};
      addEventListener('pointerup',end,true);addEventListener('pointercancel',end,true);
      // A drag never opens what it started on.
      addEventListener('click',e=>{if(performance.now()<(this.noClickUntil||0)&&onHub(e.target)){e.stopPropagation();e.preventDefault()}},true);
      const st=document.createElement('style');st.textContent='body.phone-zoom #locker-canvas,body.phone-zoom .book-button,body.phone-zoom .prop-button{touch-action:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}';document.head.append(st)}
    this.resize();return this;
  }
  blocked(){return this.busy||!!this.openBook||!!g.No2?.intro?.active||!!$('desk-dialog')?.open}
  // Phones only: a coarse pointer on a small screen. Tablets and computers keep the whole locker in view.
  phoneZoom(){const on=Math.min(innerWidth,innerHeight)<=600&&!!g.matchMedia?.('(pointer:coarse)').matches;if(document.body.classList.contains('phone-zoom')!==on)document.body.classList.toggle('phone-zoom',on);return on}
  // Keep the pan centre (painting pixels) where the view can really go, so a drag never stores slack beyond the edges.
  clampPan(){if(!this.panAt||this.openBook||!this.phoneZoom())return;const v=this.view(),W=innerWidth,H=innerHeight;this.panAt={x:(W/2-v.x)/v.s,y:(H/2-v.y)/v.s}}
  panBy(dx,dy){const v=this.view();if(!this.panAt)return;this.panAt.x-=dx/v.s;this.panAt.y-=dy/v.s;this.clampPan();this.redrawPan()}
  // After a pan or pinch: the painting, and the hotspot buttons over it moved to match.
  redrawPan(){if(this.panFrame)return;this.panFrame=requestAnimationFrame(()=>{this.panFrame=0;this.draw();this.paintNote();g.No2?.placeHotspots?.()})}
  // Bring a chosen thing into view (keyboard, controller, or a tap near the edge) by gliding the pan to it.
  showRegion(id){if(!this.phoneZoom()||this.openBook||!this.panAt)return;const r=this.regionFor(id);if(!r)return;const b=r.bounds,W=innerWidth,H=innerHeight-(g.No2RulerH?.()||0),m=24;
    let dx=0,dy=0;if(b.x<m)dx=m-b.x;else if(b.x+b.w>W-m)dx=Math.max(m-b.x,W-m-(b.x+b.w));if(b.y<m)dy=m-b.y;else if(b.y+b.h>H-m)dy=Math.max(m-b.y,H-m-(b.y+b.h));
    if(!dx&&!dy)return;cancelAnimationFrame(this.glide);const t0=performance.now(),from={...this.panAt},v=this.view(),to={x:from.x-dx/v.s,y:from.y-dy/v.s};
    const step=t=>{if(this.blocked())return;const k=Math.min(1,(t-t0)/260),e=1-(1-k)**3;this.panAt={x:from.x+(to.x-from.x)*e,y:from.y+(to.y-from.y)*e};this.clampPan();this.redrawPan();if(k<1)this.glide=requestAnimationFrame(step)};this.glide=requestAnimationFrame(step)}
  get bagOpen(){return false}set bagOpen(v){}
  ids(){const all=g.No2Catalog.notebooks.map(n=>n.id);return all.slice(this.set*PER_SET,this.set*PER_SET+PER_SET)}
  sets(){return Math.ceil(g.No2Catalog.notebooks.length/PER_SET)}
  // Cover the window with the painting (it is 16:9); keep the locker and door centred when the window is narrower.
  // Play view: close in on the page alone; pull back to show the tabs while paused or when the pointer nears the bottom.
  get art(){return this.ace?this.aceArt:this.arts?.[this.set]}
  lettersNow(){return(this.ace?this.aceLetters:this.letters)[this.set]}
  spines(){return SET_SPINES[this.ace?0:this.set]}
  async enterAce(){if(!this.aceArt){const keys=Object.keys(g.LockerAce||{}).filter(k=>k!=='labels'),ims=await Promise.all(['env/locker-ace.png','env/ace-letters-1.png','env/ace-letters-2.png','env/ace-letters-3.png'].map(loadImage));
     this.aceArt=ims[0];this.aceLetters=ims.slice(1,4);loadImage('env/ace-backpack.png').then(i=>{this.aceJacket=i},()=>{});loadImage('env/ace-jacket-wall.png').then(i=>{this.aceJacketWall=i},()=>{});this.aceLifts={};for(const k of Object.keys(g.LockerAce?.lift||{}))loadImage('env/ace-lift-'+k+'.png').then(i=>{this.aceLifts[k]=i;if(this.ace&&this.lift===k)this.draw()},()=>{})}
    this.ace=true;this.set=0;this.lift=null;this.key='';document.body.classList.add('ace-locker');g.No2?.renderHub?.();this.draw();this.paintNote()}
  leaveAce(){this.ace=false;this.set=0;this.lift=null;this.key='';document.body.classList.remove('ace-locker');g.No2?.renderHub?.();this.draw();this.paintNote()}
  view(){if(this.openBook&&this.playView()){const W=innerWidth,H=innerHeight-(g.No2RulerH?.()||0),G=this.gameBox(),pad=document.body.classList.contains('touch-play')?0:30,k=this.peek||0;
      const near=this.fitView(W,H,{l:G.x-pad,r:G.x+G.w+pad,t:G.y-pad,b:G.y+G.h+pad});if(!k)return near;
      // Pulled back (paused, or the pointer near the bottom): the whole page and its five tabs.
      const far=this.fitView(W,H,{l:1440,r:4060,t:PAGES.turned.y-40,b:2770});return{s:near.s+(far.s-near.s)*k,x:near.x+(far.x-near.x)*k,y:near.y+(far.y-near.y)*k}}
    // Cover the window, but never crop what matters: the whole locker, or the whole open notebook with its tabs.
    // On very wide or tall windows this leaves margins, filled by a blurred copy of the same painting (see draw).
    const W=innerWidth,H=innerHeight,k=this.openBook?{x:560,y:200,w:4380,h:2800}:{x:1150,y:0,w:3400,h:3072},FH=innerHeight,s=Math.min(Math.max(W/IW,FH/IH),W/k.w,H/k.h);
    // Phones: the locker is drawn close, filling the screen's long side, and the player moves round it by
    // dragging (pinch to come closer or step back); see pan() and the canvas gestures in init.
    if(!this.openBook&&this.phoneZoom()){const fill=Math.max(W/k.w,H/k.h),z=this.zoom??1,s2=Math.max(s,Math.min(fill*2,fill*z)),P=this.panAt||(this.panAt={x:k.x+k.w/2,y:k.y+k.h/2});
      const axis=(len,c,lo,hi)=>{const span=(hi-lo)*s2;if(span<=len)return(len-span)/2-lo*s2;return Math.min(-lo*s2,Math.max(len-hi*s2,len/2-c*s2))};
      return{s:s2,x:axis(W,P.x,k.x,k.x+k.w),y:axis(H,P.y,k.y,k.y+k.h)}}
    const place=(len,img,c)=>img<=len?(len-img)/2:Math.min(0,Math.max(len-img,len/2-c*s));
    // The action ruler lies over the bottom of the painting: nothing is reserved for it here.
    // On the open notebook the five tabs must stay clear of the ruler: where the slimmed ruler still cannot fit under
    // them (phones, short windows), the spread shrinks just enough to lift them above it.
    if(this.openBook){const rh=Math.round(Math.max(52,Math.min(84,innerHeight*.072))*.7)+8,t=SPREAD.tabs[0],y=place(H,IH*s,k.y+k.h/2),bottom=y+(t.y+t.h)*s;
     if(bottom>H-rh){const s2=Math.min(s,(H-rh)/(k.y+k.h-(k.y-0))),s3=Math.min(s2,(H-rh)/((t.y+t.h)-k.y+20));return{s:s3,x:place(W,IW*s3,k.x+k.w/2),y:H-rh-(t.y+t.h)*s3}}}
    return{s,x:place(W,IW*s,k.x+k.w/2),y:place(H,IH*s,k.y+k.h/2)}}
  // The play page's view: the plate rect R (the game while playing, the page and tabs while pulled back) as large as the
  // window allows, with the close and number tags never on the paper: either on the locker beside the paper or on the
  // cover above it, whichever lets R be bigger. The page's far edge and curled corner may leave the window; R never does.
  safeBottom(){let p=document.getElementById('sab-probe');if(!p){p=document.createElement('div');p.id='sab-probe';p.style.cssText='position:fixed;bottom:0;left:0;width:0;height:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none';document.body.append(p)}return p.offsetHeight}
  fitView(W,H,R){const P=PAGES.turned,tw=this.tagW||0,th=this.tagH||0,rw=R.r-R.l;
    // With the on-screen controls (phones): the whole field fits in the room they leave, above them when
    // the screen stands (they take the bottom third) or between them when it lies (they take each side).
    // Full screen on phones: no paper margin round the field (view, pad 0), and
    // with direct touch (no controller drawn) standing screens keep only the home bar's room below the field.
    if(document.body.classList.contains('touch-play')){/* full screen: lying, the field fills the screen with the controls over it; standing, it spans the width at the top and the controls sit below */const tall=H>W,vm=Math.min(W,H),pad=Math.min(150,vm*.36),face=2*Math.min(70,vm*.17)+Math.min(62,vm*.15),side=0,top=tall?Math.max(8,(()=>{let p=document.getElementById('sat-probe');if(!p){p=document.createElement('div');p.id='sat-probe';p.style.cssText='position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top);visibility:hidden;pointer-events:none';document.body.append(p)}return p.offsetHeight})()):0,direct=!document.body.classList.contains('touch-controls'),bottom=tall?(direct?Math.max(12,this.safeBottom()):Math.max(pad,face)+70):0,
      aw=W-2*side,ah=(g.No2?.adapter?H:innerHeight)-top-bottom,s=Math.max(.02,Math.min(aw/rw,ah/(R.b-R.t)));return{s,x:side+aw/2-(R.l+R.r)/2*s,y:top+ah/2-(R.t+R.b)/2*s}}
    const sA=Math.min(W/rw,(H-th)/(R.b-P.y)),sB=Math.min((W/2-tw)/(P.w/2),H/(R.b-R.t)),s=Math.max(.05,sA,sB),above=sA>=sB;
    const half=Math.max(0,(W/s-rw)/2),rcx=(R.l+R.r)/2,cx=rcx+Math.max(-half,Math.min(half,P.x+P.w/2-rcx));
    // Vertically: the whole page when it fits, otherwise from the top of the page (or the tag room) down past R.
    const top=above?P.y-th/s:Math.min(R.t,P.y-30),want=Math.max(R.b,PAGE_EDGE+30),lo=above?th-P.y*s:-R.t*s,hi=H-R.b*s;
    const oy=(want-top)*s<=H?H/2-(top+want)/2*s:Math.min(hi,Math.max(lo,-top*s));return{s,x:W/2-cx*s,y:oy}}
  // The game's rectangle on the turned page (plate pixels): the largest one at the game's aspect on the flat paper,
  // clear of the curled corner at the bottom left, as centred across the page as the curl allows and at the top of the
  // page (so a wide game leaves its spare paper below, where the view may crop it).
  gameBox(aspect=g.No2?.adapter?.aspect||[1440,780]){const a=aspect[0]/aspect[1],key=a.toFixed(4);if(this.boxCache?.key===key)return this.boxCache.box;
    let best=null;for(let y1=FLAT.b;y1>=FLAT.t+200;y1-=5){const x0=Math.max(FLAT.l,curlX(y1)+28),w=Math.min(FLAT.r-x0,(y1-FLAT.t)*a);if(!best||w>best.w+.5)best={w,x0,y1}}
    const w=best.w,h=w/a,cx=PAGES.turned.x+PAGES.turned.w/2,box={x:Math.max(best.x0,Math.min(FLAT.r-w,cx-w/2)),y:FLAT.t,w,h};
    this.boxCache={key,box};return box}
  toScreen(r){const v=this.view();return{x:v.x+r.x*v.s,y:v.y+r.y*v.s,w:r.w*v.s,h:r.h*v.s}}
  regions(){if(!this.art)return[];const out=[];
    this.ids().forEach((id,i)=>{const sp=this.spines()[i];const t=g.No2Catalog.byId[id]?.title||id;out.push({key:id,id,notebook:true,label:!this.ace&&g.No2?.needsPad?.(id)?t+': connect a controller to play':t,bounds:this.toScreen(sp),art:sp})});
    for(const [id,r] of Object.entries(this.ace?ACE_PROPS:PROPS))out.push({key:id,id,notebook:false,label:id==='backpack'?(g.No2Catalog.notebooks.length-this.ids().length)+(this.ace?' more of his notebooks':' more notebooks'):id==='ace'?(g.No2?.aceLabel?.()||r.label):r.label,bounds:this.toScreen(r),art:r});
    return out}
  regionFor(id){return this.regions().find(r=>r.key===id)}
  pick(e){const r=this.regions().find(r=>{const b=r.bounds;return e.clientX>=b.x&&e.clientX<=b.x+b.w&&e.clientY>=b.y&&e.clientY<=b.y+b.h});return r?r.key:null}
  render(layout,lift){if(this.busy||this.openBook)return;if(lift!==this.lift||this.key===''){if(lift!==this.lift)this.activeAt=performance.now();if(lift&&lift!==this.lift&&!this.touching)requestAnimationFrame(()=>{if(!this.touching)this.showRegion(lift)});this.lift=lift;this.key='locker';this.draw();this.paintNote()}}
  // The chosen thing's name on a paper slip just above it (below it near the top of the screen), kept on screen and clear
  // of the ruler; hidden while a notebook or a page is open. The ruler still says it as the word of its Enter key.
  placeTag(){let t=document.getElementById('lift-tag');if(!t){t=document.createElement('div');t.id='lift-tag';t.setAttribute('aria-hidden','true');document.body.append(t)}
    const r=!this.openBook&&this.lift&&!document.getElementById('desk-dialog')?.open&&!g.No2?.intro?.active&&this.regionFor(this.lift);
    if(!r){t.classList.remove('on');this.tagKey='';return}const b=r.bounds,label=g.No2I18n?.t?.(r.label)??r.label,key=label+'|'+Math.round(b.x)+'|'+Math.round(b.y)+'|'+Math.round(b.w)+'|'+innerWidth+'|'+innerHeight;if(key===this.tagKey&&t.classList.contains('on'))return;this.tagKey=key;
    if(t.textContent!==label)t.textContent=label;t.classList.add('on');const h=t.offsetHeight,w=t.offsetWidth,gap=Math.max(8,innerHeight*.012),bottom=innerHeight-(g.No2RulerH?.()||0)-8;
    let below=b.y-gap-h<8,y=below?b.y+b.h+gap:b.y-gap-h;if(below&&y+h>bottom){below=false;y=Math.max(8,b.y+gap)}
    const x=Math.max(w/2+8,Math.min(innerWidth-w/2-8,b.x+b.w/2));t.classList.toggle('below',below);t.style.left=x+'px';t.style.top=y+'px'}
  draw(){const c=this.canvas,x=c.getContext('2d');if(!this.art)return;this.placeTag();const dpr=Math.min(2,devicePixelRatio||1),W=innerWidth,H=innerHeight;
    if(c.width!==Math.round(W*dpr)||c.height!==Math.round(H*dpr)){c.width=Math.round(W*dpr);c.height=Math.round(H*dpr)}/* exactly the drawn size (iPhone): 100vh is taller than the visible window while the browser's bars show, which stretched the painting under the tab labels */if(c.style.height!==H+'px'){c.style.width=W+'px';c.style.height=H+'px'}
    x.setTransform(dpr,0,0,dpr,0,0);const v=this.view();x.imageSmoothingQuality='high';
    // The ruler lies over the painting; on the open spread it slims down to fit under the tabs, so the
    // tabs stay clear without shrinking the page.
    {const ru=document.getElementById('action-ruler');if(ru){const was=parseFloat(ru.style.getPropertyValue('--rh'))||1;
     if(this.openBook&&!this.playView()){const base=ru.offsetHeight/was||72,free=innerHeight-(v.y+(SPREAD.tabs[0].y+SPREAD.tabs[0].h)*v.s)-4,rh=Math.max(.7,Math.min(1,free/base));if(Math.abs(rh-was)>.01)ru.style.setProperty('--rh',rh.toFixed(3))}
     else if(was!==1)ru.style.removeProperty('--rh');if(ru.style.left)ru.style.left=''}}
    if(v.x>0||v.y>0||v.x+IW*v.s<W-1||v.y+IH*v.s<H-1){const cs=Math.max(W/IW,H/IH);x.save();/* blurred by drawing a tiny copy large (iPhone: Safari ignores a canvas filter, so the margins showed the painting repeated sharp) */if(!this.softArt||this.softArt.src!==this.art){const t=document.createElement('canvas');t.width=48;t.height=Math.round(48*IH/IW);const tg=t.getContext('2d');tg.imageSmoothingQuality='high';tg.drawImage(this.art,0,0,t.width,t.height);this.softArt={src:this.art,c:t}}x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(this.softArt.c,(W-IW*cs)/2,(H-IH*cs)/2,IW*cs,IH*cs);x.fillStyle='rgba(20,14,28,.35)';x.fillRect(0,0,W,H);x.restore()}
    const pulled=!this.openBook&&this.lift&&this.regionFor(this.lift),moved=null;
    // Under a pulled-out notebook's block the titles are left off: the block has them painted in.
    const paint=()=>{x.drawImage(this.art,v.x,v.y,IW*v.s,IH*v.s);x.save();if(moved){x.beginPath();x.rect(0,0,W,H);x.rect(v.x+moved.x*v.s,v.y+moved.y*v.s,moved.w*v.s,moved.h*v.s);x.clip('evenodd')}x.drawImage(this.lettersNow(),v.x,v.y,IW*v.s,IH*v.s);x.restore();if(this.ace){this.paintAceTag(x,v);return}if(!this.openBook){this.paintBag(x,v);this.paintPadOnly(x,v)}this.paintCalendar(x,v);this.paintStickers(x,v);if(this.moonOn()&&!(this.lift==='globe'&&!this.openBook))this.drawMoon(x,v,0)};
    paint();
    const r=this.lift&&this.regionFor(this.lift);
    if(r&&!this.openBook&&r.key!=='stickers'){this.pullOut(x,v,r);
      // A lift frame is painted from the door before the swap stickers (high scores covered them): they
      // is drawn again over the frame, everywhere but on the lifted thing itself.
      if(!this.ace){/* only when the lifted thing stays clear of the stickers; else they wait under it */const b=r.bounds,S=this.toScreen(PROPS.stickers);if(b.x+b.w<S.x-4||b.x>S.x+S.w+4||b.y+b.h<S.y-4||b.y>S.y+S.h+4)this.paintStickers(x,v)}}
    // The ruler steps aside when it would cover the chosen thing (it hid the detention slip): it slides
    // left or right, whichever is shorter, just far enough to clear it, and comes back when nothing low is chosen.
    {const ru=document.getElementById('action-ruler');if(ru){let dx=0;/* only on the bare locker: never under an open page (the ruler sat off-centre under the first-launch map) */if(r&&!this.openBook&&!$('desk-dialog')?.open&&!g.No2?.intro?.active){const R=ru.getBoundingClientRect(),cur=parseFloat(getComputedStyle(ru).translate)||0,L=R.left-cur,Rt=R.right-cur,P=(this.ace?g.LockerAce?.lift:g.LockerPull)?.[r.key],b0=r.bounds,b1=P?this.toScreen(P):b0,b={x:Math.min(b0.x,b1.x),y:Math.min(b0.y,b1.y),w:Math.max(b0.x+b0.w,b1.x+b1.w)-Math.min(b0.x,b1.x),h:Math.max(b0.y+b0.h,b1.y+b1.h)-Math.min(b0.y,b1.y)},pad=16;
      if(b.y+b.h>R.top&&b.x<Rt&&b.x+b.w>L){const toL=b.x-pad-Rt,toR=b.x+b.w+pad-L;dx=-toL<toR?toL:toR;if(L+dx<4||Rt+dx>innerWidth-4)dx=Math.abs(toL)<Math.abs(toR)?toL:toR}}
      ru.dataset.dx=dx;if(dx)ru.style.setProperty('translate',dx+'px 0','important');else ru.style.removeProperty('translate');ru.style.setProperty('transition','translate .18s ease-out','important')}}
    if(this.dim){x.fillStyle='rgba(20,24,40,'+(.45*this.dim)+')';x.fillRect(0,0,W,H)}
    // An open notebook: the spread (or, on the play page, the turned notebook) painted over the dimmed locker.
    if(this.openBook){const c=this.cover,plate=c&&(this.playView()?c.play:c.spread);if(plate){x.save();x.globalAlpha=this.playView()?1:this.dim;x.drawImage(plate,v.x,v.y,IW*v.s,IH*v.s);this.drawPaper(x,v);
      x.restore()}}
  }
  // The index card that named the chosen thing was taken off the door (not that useful; the detention
  // slip hangs in its place). The action ruler names what is chosen; the label stays hidden.
  paintNote(){if(this.label)this.label.style.display='none'}
  resize(){if(!this.art)return;this.draw();this.paintNote()}
  drawPaper(x,v){const p=this.paper;if(!p)return;x.save();x.globalCompositeOperation='multiply';
    const put=(r,turn)=>{const b={x:v.x+r.x*v.s,y:v.y+r.y*v.s,w:r.w*v.s,h:r.h*v.s};x.save();x.beginPath();x.roundRect(b.x,b.y,b.w,b.h,18*v.s);
      // The turned page's curled corner keeps its painted paper: its outline cuts the paper type away (even-odd).
      if(turn){x.moveTo(v.x+1380*v.s,v.y+1940*v.s);for(const[px,py]of CURL)x.lineTo(v.x+px*v.s,v.y+py*v.s);x.lineTo(v.x+1990*v.s,v.y+2560*v.s);x.lineTo(v.x+1380*v.s,v.y+2560*v.s);x.closePath()}x.clip('evenodd');
      if(turn){x.translate(b.x+b.w,b.y);x.rotate(Math.PI/2);x.drawImage(p,0,0,b.h,b.w)}else x.drawImage(p,b.x,b.y,b.w,b.h);x.restore()};
    if(this.playView())put(PAGES.turned,true);else for(const r of PAGES.spread)put(r,false);x.restore()}
  // Her doodles for this page (the old page's ::before art) move to the left page, spread over it.
  leftDoodles(L){let box=$('nb-left');if(!box){box=document.createElement('div');box.id='nb-left';document.body.append(box)}
    if(!L||!this.openBook){box.style.display='none';return}
    const pp=$('paper-page'),bg=pp?getComputedStyle(pp,'::before').backgroundImage:'none',urls=[...bg.matchAll(/url\("?(.*?)"?\)/g)].map(m=>m[1]);
    const key=urls.join('|');Object.assign(box.style,{display:'block',left:L.x+'px',top:L.y+'px',width:L.w+'px',height:L.h+'px'});
    const n=g.No2Catalog.byId[this.openBook.id],kk=key+'|'+n.id;
    if(box.dataset.key!==kk){box.dataset.key=kk;const name=document.createElement('div');name.className='nb-name';name.textContent=n.title;box.replaceChildren(name,...urls.map((u,i)=>{const im=document.createElement('img');im.src=u;return im}))}
    box.querySelector('.nb-name').style.fontSize=(L.w*.085)+'px';
    // Each doodle fits its own slot (width and the height left on the page), so a tall one never hangs off the paper.
    // Locker Gauntlet's first doodle is its four students in a row, so it takes a wide slot.
    // Research sketches: on the title page four drawings share the page, her working studies beside the finished doodles.
    const spots=urls.length===4?[[.05,.24,.48,.38,-3],[.6,.26,.3,.3,4],[.46,.6,.48,.36,2],[.06,.66,.34,.28,-4]]:n.id==='locker-gauntlet'?[[.08,.28,.8,.2,-2],[.52,.5,.34,.46,5],[.12,.72,.3,.25,-3]]:[[.12,.29,.34,.4,-6],[.52,.5,.34,.46,5],[.12,.72,.3,.25,-3]];
    [...box.querySelectorAll('img')].forEach((im,i)=>{const [x,y,w,h,rot]=spots[i%spots.length],fit=()=>{const r=im.naturalWidth?im.naturalHeight/im.naturalWidth:1,iw=Math.min(w*L.w,h*L.h/r);Object.assign(im.style,{left:(x*L.w+(w*L.w-iw)/2)+'px',top:y*L.h+'px',width:iw+'px',transform:'rotate('+rot+'deg)'})};fit();if(!im.complete)im.onload=fit})}
  // Page turn: a tab to a later page lifts the right page and lays it over the left one, an earlier
  // tab turns the left page back. The leaf is a row of narrow hinged strips, so the paper bends while it turns and lies flat
  // again as it lands; each side is a copy of that page as it is (its painted paper from this canvas, cut to the page's own
  // outline with its dog-eared corners, plus a copy of its words and doodles). The real pages change underneath, covered by
  // copies of the old ones until the leaf lands.
  snapPages(){if(!this.openBook||this.playView()||matchMedia('(prefers-reduced-motion: reduce)').matches)return null;
    const layer=document.createElement('div');layer.className='page-flip';layer.setAttribute('aria-hidden','true');layer.inert=true;document.body.append(layer);
    const old={layer,left:this.pagePart(0,$('nb-left')),right:this.pagePart(1,$('paper-page'))};old.covers=[old.left,old.right].map(p=>{const c=this.partView(p,p.P.x,p.P.y);c.style.left=p.P.x+'px';c.style.top=p.P.y+'px';layer.append(c);return c});return old}
  pagePart(side,el){const P=this.toScreen(LEAF[side]),dpr=this.canvas.width/innerWidth,c=document.createElement('canvas');c.width=Math.round(P.w*dpr);c.height=Math.round(P.h*dpr);
    c.getContext('2d').drawImage(this.canvas,P.x*dpr,P.y*dpr,P.w*dpr,P.h*dpr,0,0,c.width,c.height);const v=this.view(),clip='polygon('+OUTLINE[side].map(([x,y])=>(v.x+x*v.s-P.x).toFixed(1)+'px '+(v.y+y*v.s-P.y).toFixed(1)+'px').join(',')+')';
    let dom=null;if(el&&getComputedStyle(el).display!=='none'){const r=el.getBoundingClientRect();dom=el.cloneNode(true);for(const[p,val]of Object.entries({position:'absolute',left:(r.left-P.x)+'px',top:(r.top-P.y)+'px',width:r.width+'px',height:r.height+'px'}))dom.style.setProperty(p,val,'important')}
    return{P,canvas:c,dom,clip}}
  // The page as it looks, placed with its corner at (x, y) of the element it goes in.
  partView(p,x,y){const f=document.createElement('div');f.className='flip-page';Object.assign(f.style,{left:(p.P.x-x)+'px',top:(p.P.y-y)+'px',width:p.P.w+'px',height:p.P.h+'px',clipPath:p.clip});
    const c=document.createElement('canvas');c.width=p.canvas.width;c.height=p.canvas.height;c.getContext('2d').drawImage(p.canvas,0,0);f.append(c);if(p.dom)f.append(p.dom.cloneNode(true));return f}
  async flipPages(old,dir){if(!old)return;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const {layer}=old;
    if(!this.openBook||this.playView()){layer.remove();return}
    const fwd=dir>0,sg=fwd?1:-1,v=this.view(),spine=v.x+SPINE*v.s,front=fwd?old.right:old.left,back=this.pagePart(fwd?0:1,fwd?$('nb-left'):$('paper-page'));
    old.covers[fwd?1:0].remove();
    const top=Math.min(front.P.y,back.P.y),H=Math.max(front.P.y+front.P.h,back.P.y+back.P.h)-top,W=Math.max(front.P.x+front.P.w-spine,spine-front.P.x,back.P.x+back.P.w-spine,spine-back.P.x),N=10,sw=W/N;
    // Strip i covers [i, i+1] x sw from the spine on the side the leaf starts; its back shows the mirrored strip of the new page.
    const strips=[];let parent=layer;
    for(let i=0;i<N;i++){const st=document.createElement('div');st.className='flip-strip';Object.assign(st.style,{width:(sw+.6)+'px',height:H+'px',transformOrigin:fwd?'0 50%':'100% 50%'});
      if(i===0)Object.assign(st.style,{left:(fwd?spine:spine-sw)+'px',top:top+'px'});else st.style.left=(fwd?sw:-sw)+'px';
      const a=fwd?spine+i*sw:spine-(i+1)*sw,b=fwd?spine-(i+1)*sw:spine+i*sw,fr=document.createElement('div'),bk=document.createElement('div');fr.className=bk.className='flip-side';bk.style.transform='rotateY(180deg)';
      fr.append(this.partView(front,a,top));bk.append(this.partView(back,b,top));for(const s of [fr,bk]){const sh=document.createElement('i');sh.className='flip-shade';s.append(sh)}
      st.append(fr,bk);parent.append(st);parent=st;strips.push({st,shF:fr.lastChild,shB:bk.lastChild})}
    const T=760,t0=performance.now(),ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
    await new Promise(done=>{const step=now=>{const t=Math.min(1,(now-t0)/T),p=ease(t),bend=95*Math.sin(Math.PI*p)*Math.min(1,(1-p)*3);let acc=0;
      strips.forEach((s,i)=>{const d=i?-sg*bend/(N-1)*(i/(N-1))*2:-sg*180*p;acc+=d;s.st.style.transform='rotateY('+d.toFixed(2)+'deg)';const k=Math.abs(Math.sin(acc*Math.PI/180));s.shF.style.opacity=(.3*k).toFixed(3);s.shB.style.opacity=(.3*k).toFixed(3)});
      if(t<1)requestAnimationFrame(step);else done()};requestAnimationFrame(step)});
    layer.remove()}
  playView(){const n=g.No2Catalog.byId[this.openBook?.id];return document.body.dataset.view==='play'&&!!n?.available}
  pageRect(){if(!this.openBook)return{x:0,y:0,w:innerWidth,h:innerHeight,scale:innerWidth/1440};const r=this.toScreen(this.playView()?PLAY.page:SPREAD.content);return{...r,scale:r.w/1440}}
  // Places the shell's page DOM on the painted notebook: content on the right page, the close button and breadcrumb on
  // the left page, the five page tabs over the painted tabs, the game centred on the turned page at its own aspect.
  layoutPages(aspect){const play=this.playView();if(play){const gap=Math.round(innerHeight*.02);this.tagW=Math.max($('close-book')?.offsetWidth||0,$('book-breadcrumb')?.offsetWidth||0)+2*gap;this.tagH=($('book-chrome')?.offsetHeight||40)+2*gap}const r=this.pageRect(),L=this.toScreen(SPREAD.left),set=(el,b)=>{if(el)for(const[k,v]of Object.entries({left:b.x+'px',top:b.y+'px',width:b.w+'px',height:b.h+'px'}))el.style.setProperty(k,v,'important')};
    set($('paper-page'),r);// Close and page number sit above the notebook, off the paper, so no printed paper header is ever covered.
    const ch=$('book-chrome');if(ch){const top=play?this.toScreen(PAGES.turned):this.toScreen({x:930,y:265,w:3660,h:0}),hh=ch.offsetHeight||40;let x=top.x,w=top.w,y=Math.max(8,top.y-hh-(play?Math.round(innerHeight*.02):10));
      // The turned page fills the window's height, so its close and number move out to the locker on either side when they fit (review U-05).
      if(play){const paper=this.toScreen({x:PAGES.turned.x,y:0,w:PAGES.turned.w,h:0}),gap=Math.round(innerHeight*.02),bc=$('book-breadcrumb'),need=()=>Math.max($('close-book')?.offsetWidth||0,bc?.offsetWidth||0)+2*gap,fits=()=>paper.x+1>=need()&&innerWidth-(paper.x+paper.w)+1>=need();
        // Otherwise they sit on the cover above the paper, the full label kept (the view leaves room, see view()).
        if(fits()){x=gap;w=innerWidth-2*gap;y=gap}else{const l=Math.max(gap,x);w=Math.min(innerWidth-gap,x+w)-l;x=l}}
      ch.style.setProperty('left',x+'px','important');ch.style.setProperty('width',w+'px','important');ch.style.setProperty('top',y+'px','important')
      if(play)this.placeSlip()}
    const tabs=play?PLAY.tabs:SPREAD.tabs;[...document.querySelectorAll('#page-tabs button')].forEach((b,i)=>{if(tabs[i])set(b,this.toScreen(tabs[i]))});
    // A tab's word fits its tab (phones): its type steps down until it does, never below the meta size's floor.
    for(const b of document.querySelectorAll('#page-tabs button')){b.style.removeProperty('font-size');let f=parseFloat(getComputedStyle(b).fontSize),n=0;while(b.scrollWidth>b.clientWidth+1&&f>9&&n++<20){f-=1;b.style.setProperty('font-size',f+'px','important')}}
    this.placeTabGlyphs();
    // The right page is about half the old page: shrink the page's own unit so the copy fits its page.
    const pc=$('paper-content');if(pc){pc.style.setProperty('--ui',(r.w/900)+'px');pc.style.setProperty('--pagew',r.w+'px')}
    this.leftDoodles(play?null:L);
    // On the play page the game sits on the flat paper, clear of the curled corner (gameBox).
    const box=play?this.toScreen(this.gameBox(aspect)):r,[aw,ah]=aspect,gw=Math.min(box.w,box.h*aw/ah),gh=gw*ah/aw;const gr={x:box.x+(box.w-gw)/2,y:box.y+(box.h-gh)/2,w:gw,h:gh};set($('game-mount'),gr);const changed=JSON.stringify(gr)!==JSON.stringify(this.gameRectRaw);this.gameRectRaw=gr;this.gameRect={x:gr.x,y:gr.y,width:gr.w,height:gr.h};if(changed&&play)this.draw()}
  // A tiny victory earned while playing is written on a slip off the paper, so it never covers the game or its score:
  // under the close tag on the locker when the tags sit beside the page, else on the cover between the two tags.
  placeSlip(){const gap=Math.round(innerHeight*.02),paper=this.toScreen(PAGES.turned),c=$('close-book')?.getBoundingClientRect(),n=$('book-breadcrumb')?.getBoundingClientRect(),b=document.body.style;if(!c||!n)return;
    const side=paper.x-2*gap,beside=c.right<=paper.x+1&&side>=110;
    const r=beside?{x:gap,y:c.bottom+gap,w:side,ty:'0'}:{x:c.right+gap,y:Math.max(gap,paper.y)/2,w:Math.max(120,n.left-c.right-2*gap),ty:'-50%'};
    b.setProperty('--slip-x',r.x+'px');b.setProperty('--slip-y',r.y+'px');b.setProperty('--slip-w',r.w+'px');b.setProperty('--slip-ty',r.ty);b.setProperty('--slip-head',beside?'block':'inline')}
  // LB and RB glyphs just outside the first and last tab (controller mode only; host.js toggles them).
  placeTabGlyphs(){const tabs=[...document.querySelectorAll('#page-tabs button')];if(!tabs.length)return;const a=tabs[0].getBoundingClientRect(),b=tabs[tabs.length-1].getBoundingClientRect(),h=a.height*.95,w=h*1.6;for(const [id,x] of [['tab-LB',a.left-w-h*.25],['tab-RB',b.right+h*.25]]){const g=$(id);if(g)Object.assign(g.style,{position:'fixed',left:x+'px',top:(a.top+(a.height-h)/2)+'px',width:w+'px',height:h+'px'})}}
  async fade(to,ms){const from=this.dim,reduced=g.No2?.services.save.settings.reduced||matchMedia('(prefers-reduced-motion: reduce)').matches,start=performance.now();
    await new Promise(res=>{const f=now=>{const t=reduced?1:Math.min(1,(now-start)/ms);this.dim=from+(to-from)*t*t*(3-2*t);this.draw();if(t<1)requestAnimationFrame(f);else res()};requestAnimationFrame(f)})}
  async open(id){if(this.openBook?.id===id)return;this.busy=true;this.label.style.display='none';
    const rec=this.assets.loaded.get(g.No2Catalog.byId[id].paperAsset);if(!rec)throw Error('Paper is not loaded');this.paperFrames.set(rec.id,rec.texture);
    const name=COVERS[g.No2Catalog.byId[id].index%COVERS.length];
    if(!this.covers.has(name))this.covers.set(name,Promise.all(['env/nb-spread-'+name+'.png','env/nb-play-'+name+'.png'].map(loadImage)).then(([spread,play])=>({spread,play})));
    this.cover=await this.covers.get(name);const kind=g.No2Catalog.byId[id].paper;if(!this.papers)this.papers=new Map();if(!this.papers.has(kind))this.papers.set(kind,loadImage('env/paper3-'+kind+'.png').catch(()=>null));this.paper=await this.papers.get(kind);this.openBook={id,paper:rec.image};await this.fade(1,260);this.busy=false}
  async close(){if(!this.openBook)return;this.busy=true;this.leftDoodles(null);await this.fade(0,220);this.openBook=null;this.paperFrames.clear();this.busy=false;this.key='';this.draw();this.paintNote()}
  // The stack on the lower shelf pages through the notebooks, ten at a time (the shell calls this for "backpack").
  // A chosen notebook's name sticker lights up (after the zoom, lean, highlight and painted pull-outs):
  // the sticker in its painted shape turns brighter with a soft glow around it and its title on top; nothing moves.
  // The sketchbook's moon glows; other props lift off the door or shelf in their approved painted frames (tools/pack-locker-pull.py keeps only what the edit
  // changed, softly edged). Either fades in over about 150 ms, instantly with reduced motion; the backpack shows its peek.
  // One frame at a time for the locker's own animations (slow hovers): every draw used to ask for another
  // frame, so each hover or fade started one more chain of redraws and the chains piled up until input waited for seconds.
  // One redraw per display frame for whatever is chosen now; a frame asked for by the previous choice still draws the new one,
  // so a quick move from one thing to the next never leaves the new animation waiting.
  frame(){if(this.framePending)return;this.framePending=requestAnimationFrame(()=>{this.framePending=0;if(this.lift&&!this.openBook)this.draw()})}
  pullOut(x,v,r){const now=performance.now();if(this.pullKey!==r.key){this.pullKey=r.key;this.pullAt=now}
   const reduced=g.No2?.services?.save?.settings?.reduced,raw=reduced?1:Math.min(1,(now-this.pullAt)/150),k=1-(1-raw)**3;if(raw<1)this.frame();
   const P=g.LockerPull?.[r.key],img=this.pulls?.[r.key],at=(q,p)=>[v.x+q.x*v.s,v.y+q.y*v.s,(q.w??q[2])*v.s,(q.h??q[3])*v.s];x.save();/* the slip's frame is the painting outside the slip (tools/pack-volleyball.py): drawn whole at once, so no second slip shows through a fade */x.globalAlpha=r.key==='report'?1:k;
   // The chosen notebook's spine lights up in place (the titles and emblems are painted on the spines now,
   // art-prompts/ui/spines/brief.md): the spine as painted, brighter, with a soft warm glow; for Ace his set's spine layer on top.
   if(r.notebook){const S=this.spines(),i=this.ids().indexOf(r.key),b=S[i];if(b){const{x:lx,y:ly,w:lw,h:lh}=b,f=this.art.width/IW,L=this.lettersNow(),fl=L.width/IW,d=at({x:lx,y:ly,w:lw,h:lh});
     // The glow stays on the shelf, never on the locker's walls.
     const c0=at({x:S[0].x,y:ly-200,w:S[S.length-1].x+S[S.length-1].w-S[0].x,h:lh+400});x.beginPath();x.rect(...c0);x.clip();
     x.shadowColor='rgba(255,248,226,.9)';x.shadowBlur=34*v.s*IW/1920*k;x.filter='brightness(1.18) saturate(.92)';x.drawImage(this.art,lx*f,ly*f,lw*f,lh*f,...d);
     x.shadowColor='transparent';if(this.ace)x.drawImage(L,lx*fl,ly*fl,lw*fl,lh*fl,...d);x.filter='none'}x.restore();return}
   // His things lift in painted two-state frames like hers (replacing the code lifts; tools/pack-ace.py).
   // His jacket swings on its hook instead (the jacket moves, not the light behind it): the jacket
   // cut from his painting turning gently about the hook over the empty wall behind it (a Nano Banana edit), so no static copy shows.
   if(this.ace&&r.key==='backpack'&&this.aceJacket){const P=g.LockerAce?.backpack,t=(now-this.pullAt)/1000,a=reduced?0:.06*Math.exp(-1.2*t)*Math.sin(t*5.2)+.02*Math.sin(t*1.8),hx=v.x+1720*v.s,hy=v.y+2150*v.s;
     const W=g.LockerAce?.jacketWall;if(W&&this.aceJacketWall)x.drawImage(this.aceJacketWall,...at(W));x.translate(hx,hy);x.rotate(a);x.translate(-hx,-hy);x.shadowColor='rgba(20,14,30,.45)';x.shadowBlur=14*v.s*IW/1920;x.shadowOffsetX=5*v.s*IW/1920;x.shadowOffsetY=7*v.s*IW/1920;x.drawImage(this.aceJacket,...at(P));x.shadowColor='transparent';x.shadowOffsetX=x.shadowOffsetY=0;this.paintAceTag(x,v);x.restore();if(!reduced)this.frame();return}
   if(this.ace){const C=this.aceLifts?.[r.key],P=g.LockerAce?.lift?.[r.key];if(C&&P){
     // His jacket swings on its hook: the painted frame turns gently about the hook.
     x.drawImage(C,...at(P))}x.restore();return}
   // The sketchbook: the moon on its cover lights up, a warm glow over the painted moon.
   if(r.key==='intro'){const[cx,cy]=[v.x+1700*v.s,v.y+305*v.s],R=118*v.s;const gl=x.createRadialGradient(cx,cy,0,cx,cy,R*1.6);gl.addColorStop(0,'rgba(255,242,200,.7)');gl.addColorStop(.55,'rgba(255,238,185,.45)');gl.addColorStop(1,'rgba(255,236,180,0)');
    x.globalCompositeOperation='screen';x.fillStyle=gl;x.beginPath();x.arc(cx,cy,R*1.6,0,Math.PI*2);x.fill();x.restore();return}
   // The globe spins smoothly while it is chosen: her painted world map (Nano Banana) turned on the ball
   // in an orthographic view on its axis tilted 23.5 degrees like the Earth, leaning with the painted meridian ring (top to the right), turning west to east, lit from the painting's side, under the painted rim; held still with
   // reduced motion.
   // The daily calendar stays as painted: only its push pin works itself out of the door and back in,
   // drawn from the painting itself (cut out with its outline) and grown about its middle as it comes toward you, so it always covers the painted one, its shadow sliding off.
   // The volleyball lights up while it is chosen (simpler than turning it): the painted ball, cut to its own
   // shape, drawn brighter with a soft warm glow, the slip and sneaker drawn again in front. Chosen, it gives a little bounce
   // (it grows from where it rests, never smaller than painted, so the painted ball stays covered) and its glow breathes.
   // The ball, the slip and the calendar now lift in painted two-state frames like the other props; the
   // code animations below only run if a frame is missing.
   // The detention slip on the door (was behind the sneaker): cut from the painting, chosen it lifts a
   // little off the door with a shadow, flutters on its tape and settles into a slow sway.
   // Held still with reduced motion.
   // The slip (it looked soft and lifted over a still copy of itself): bare door under it (slip-wall.webp,
   // a Nano Banana edit) and the slip cut at the painting's own resolution (slip.webp), both from tools/pack-door-slip.py.
   if(r.key==='report'){const LW=g.LockerPull?.slipWall,LS=g.LockerPull?.slip,wall=this.pulls?.slipWall,slip=this.pulls?.slip;if(!(LW&&LS&&wall&&slip)){x.restore();return}
    x.globalAlpha=1;x.drawImage(wall,...at(LW));
    const t=(now-this.pullAt)/1000,still=g.No2?.services?.save?.settings?.reduced,a=still?0:.045*Math.exp(-2.5*t)*Math.sin(t*12)+.022*Math.sin(t*2.4),px=v.x+3922*v.s,py=v.y+2190*v.s;/* about its tape */
    x.translate(px,py);x.rotate(a);x.scale(1.05,1.05);x.translate(-px,-py);
    x.shadowColor='rgba(28,20,40,.5)';x.shadowBlur=16*v.s*IW/1920*k;x.shadowOffsetX=5*v.s*IW/1920*k;x.shadowOffsetY=9*v.s*IW/1920*k;x.drawImage(slip,...at(LS));x.restore();if(!still)this.frame();return}
   // The volleyball (the painted ball bounces over an empty-wall frame, slip and sneaker in front).
   // All three layers are cut from the painting by tools/pack-volleyball.py, so the ball at rest is exactly the painting:
   // the wall (shoe.webp), the ball (ball.webp, running on behind the compartment's edge and the slip) and everything in
   // front of it (shoe-front.webp: the edge, the sneaker, the slip). Drawn whole from the first frame, never faded in,
   // so no second ball shows through; the hop starts and ends at rest and grows from the ball's bottom (hidden behind the
   // sneaker and the slip: the whole round ball hops, never just the part above its lower panel's seam).
   if(r.key==='shoe'&&img&&P){const t=(now-this.pullAt)/1000,still=g.No2?.services?.save?.settings?.reduced,b=still?.35:Math.abs(Math.exp(-3*t)*Math.sin(t*11))*.7+.45*Math.max(0,Math.sin(t*4.4))**3,u=v.s*IW/1920;
    x.globalAlpha=1;x.drawImage(img,...at(P));if(this.ballSprite){const d=at(P),cx=v.x+2535*v.s,cy=v.y+2860*v.s,sc=1+.03*b;
     x.save();x.shadowColor='rgba(28,20,40,'+(.5*Math.min(1,b*3))+')';x.shadowBlur=14*u*b;x.shadowOffsetX=4*u*b;x.shadowOffsetY=8*u*b;x.translate(cx,cy-16*b*u);x.scale(sc,sc);x.translate(-cx,-cy);x.drawImage(this.ballSprite,...d);x.restore()}
    if(this.shoeFront)x.drawImage(this.shoeFront,...at(P));x.restore();if(!still)this.frame();return}
   if(r.key==='daily'&&!img){const reduced=g.No2?.services?.save?.settings?.reduced,f=this.art.width/IW,K=5504/3840,B=[2405*K,388*K,50*K,52*K];
    if(!this.pinSprite||this.pinSprite.art!==this.art){const c=document.createElement('canvas');c.width=Math.round(B[2]*f);c.height=Math.round(B[3]*f);const q=c.getContext('2d'),s=c.width/50;
     q.drawImage(this.art,B[0]*f,B[1]*f,B[2]*f,B[3]*f,0,0,c.width,c.height);q.globalCompositeOperation='destination-in';q.fillStyle='#000';q.beginPath();
     q.ellipse(33*s,14*s,10.5*s,10*s,-.5,0,Math.PI*2);q.moveTo(36*s,30*s);q.ellipse(22*s,30*s,14*s,11.5*s,-.5,0,Math.PI*2);/* one mask: a second destination-in pass would erase the first */q.moveTo(9*s,37*s);q.lineTo(18*s,38*s);q.lineTo(16*s,49*s);q.lineTo(8*s,48*s);q.closePath();q.fill();this.pinSprite={c,art:this.art}}
    // The calendar lifts off the door like the other props (no bright glow), swaying on its pin, its date written on again, the pin in front.
    const t=(now-this.pullAt)/1000,Q=[[3328,605],[3580,592],[3594,915],[3350,928]],CB=[3315,580,290,360],cw=Math.round(CB[2]*v.s),ch=Math.round(CB[3]*v.s),ck=cw+'x'+ch+this.set,dpr=g.devicePixelRatio||1;
    if(this.calCutKey!==ck+'@'+dpr){const c=Object.assign(document.createElement('canvas'),{width:Math.round(cw*dpr),height:Math.round(ch*dpr)}),q=c.getContext('2d');q.scale(dpr,dpr);/* device pixels, never soft */q.beginPath();Q.forEach(([px,py],n)=>q[n?'lineTo':'moveTo']((px-CB[0])*v.s,(py-CB[1])*v.s));q.closePath();q.clip();q.drawImage(this.art,CB[0]*f,CB[1]*f,CB[2]*f,CB[3]*f,0,0,cw,ch);this.calCut=c;this.calCutKey=ck+'@'+dpr}
    x.save();{const cx=v.x+3460*v.s,cy=v.y+600*v.s,sw=reduced?0:.018*Math.sin(t*2.2)+.03*Math.exp(-3*t)*Math.sin(t*10);x.translate(cx,cy);x.rotate(sw);x.scale(1.03,1.03);x.translate(-cx,-cy)}x.shadowColor='rgba(28,20,40,.5)';x.shadowBlur=16*v.s*IW/1920*k;x.shadowOffsetX=5*v.s*IW/1920*k;x.shadowOffsetY=9*v.s*IW/1920*k;x.drawImage(this.calCut,v.x+CB[0]*v.s,v.y+CB[1]*v.s,cw,ch);x.shadowColor='transparent';x.shadowOffsetX=x.shadowOffsetY=0;this.paintCalendar(x,v);x.restore();
    const out=reduced?.6:Math.min(1,t*4)*(.5-.5*Math.cos(t*Math.PI*2/1.3)),tip=[B[0]+23*K,B[1]+27*K],d=at({x:B[0],y:B[1],w:B[2],h:B[3]}),tx=v.x+tip[0]*v.s,ty=v.y+tip[1]*v.s,sc=1+.35*out;
    x.globalAlpha=.28*out;x.filter='brightness(0) blur('+(4*v.s*IW/1920)+'px)';x.drawImage(this.pinSprite.c,d[0]+out*16*v.s,d[1]+out*20*v.s,d[2],d[3]);x.filter='none';x.globalAlpha=1;
    x.translate(tx,ty);x.scale(sc,sc);x.translate(-tx,-ty);x.drawImage(this.pinSprite.c,d[0],d[1],d[2],d[3]);x.restore();if(!reduced)this.frame();return}
   if(r.key==='globe'&&this.moonOn()){const red=g.No2?.services?.save?.settings?.reduced;this.drawMoon(x,v,red?0:(now-this.pullAt)/1000);if(!red)this.frame()}
   else if(r.key==='globe'){const G=g.LockerPull?.globe3d,M=this.globeMap,reduced=g.No2?.services?.save?.settings?.reduced;
    if(G&&M&&!reduced){const [bx,by,bw,bh]=G.ball,d=at({x:bx,y:by,w:bw,h:bh}),n=Math.max(64,Math.min(480,Math.round(d[2]*(g.devicePixelRatio||1)*1.6)));
     if(!this.globeBuf||this.globeBuf.n!==n){const c=document.createElement('canvas');c.width=c.height=n;const q=c.getContext('2d'),img=q.createImageData(n,n),geo=new Float32Array(n*n*3),ct=Math.cos(G.tilt),st=Math.sin(G.tilt);
      for(let y=0;y<n;y++)for(let x=0;x<n;x++){const u=(x+.5)/n*2-1,v=(y+.5)/n*2-1,r2=u*u+v*v,k=(y*n+x)*3;if(r2>1){geo[k]=NaN;continue}const z=Math.sqrt(1-r2),uu=u*ct+v*st,vv=-u*st+v*ct;
       geo[k]=Math.atan2(uu,z);geo[k+1]=Math.asin(Math.max(-1,Math.min(1,vv)));geo[k+2]=.62+.38*Math.max(0,.55*z-.45*u-.35*v+.25)}
      this.globeBuf={n,c,q,img,geo}}
     const B=this.globeBuf,px=B.img.data,lon0=G.face*Math.PI/180-((now-this.pullAt)/1000)*2*Math.PI/G.turn;
     for(let i=0;i<n*n;i++){const k=i*3,o=i*4,lo=B.geo[k];if(lo!==lo){px[o+3]=0;continue}let L=(lo+lon0)/(2*Math.PI);L-=Math.floor(L);const la=B.geo[k+1],tx=Math.min(M.w-1,L*M.w|0),ty=Math.min(M.h-1,Math.max(0,(.5+la/Math.PI)*M.h|0)),t=(ty*M.w+tx)*4,sh=B.geo[k+2];
      px[o]=M.d[t]*sh;px[o+1]=M.d[t+1]*sh;px[o+2]=M.d[t+2]*sh;px[o+3]=255}
     B.q.putImageData(B.img,0,0);x.imageSmoothingQuality='high';x.drawImage(B.c,...d);if(this.globeRim)x.drawImage(this.globeRim,...at({x:G.rim[0],y:G.rim[1],w:G.rim[2],h:G.rim[3]}));
     this.frame()}
    x.restore();return}
   if(r.key==='backpack'&&this.bagPeekArt){const B=BAG_PEEK;x.beginPath();x.rect(...at({...B,h:B.h-6}));x.clip();x.drawImage(this.bagPeekArt,...at(B));x.restore();this.paintBag(x,v);this.paintCalendar(x,v);return}
   if(P&&img){x.drawImage(img,...at(P));if(r.key==='daily'){x.save();x.globalAlpha=1;this.paintCalendar(x,v);x.restore()}
    const L=this.letters[this.set],fl=L.width/IW,box=q=>at({x:q[0],y:q[1],w:q[2],h:q[3]});
    for(const t of P.titles||[]){const[fx,fy,fw,fh]=t.from;x.save();x.beginPath();x.rect(...box(t.clip));x.clip();x.drawImage(L,fx*fl,fy*fl,fw*fl,fh*fl,...box(t.to));x.restore()}}
   x.restore()}
  lockerIdle(){return !!this.art&&!this.openBook&&!this.busy&&!document.hidden&&!g.No2?.intro?.active&&!$('desk-dialog')?.open}
  // One nudge: the lifted-notebook frame fades in rising, holds, and sinks back (about 1.6 s).
  // The bag's nudge stops as soon as the player chooses something else, so it never plays over another thing's animation.
  nudge(){this.nudged=true;this.nudgeT=0;const t0=performance.now(),l0=this.lift,run=t=>{const k=(t-t0)/1600;if(k>=1||!this.lockerIdle()||this.lift!==l0){this.nudgeT=-1;this.nudgeAt=performance.now();this.draw();return}
    this.nudgeT=k;this.draw();requestAnimationFrame(run)};requestAnimationFrame(run)}
  // Input-aware locker: on a touch screen with no controller connected, the
  // controller-only notebooks (TOUCH_MODE 'none' in host.js) stand in the shade, their label saying a controller is needed.
  // The painted spines keep their places (their titles are lettered on the painting), so nothing moves for anyone.
  paintPadOnly(x,v){if(this.ace||!g.No2?.needsPad)return;const sp=this.spines();this.ids().forEach((id,i)=>{if(!g.No2.needsPad(id)||!sp[i])return;const b=sp[i];x.save();x.fillStyle='rgba(236,229,214,.62)';x.fillRect(v.x+b.x*v.s,v.y+b.y*v.s,b.w*v.s,b.h*v.s);x.restore()})}
  bagSeenNow(){if(this.bagSeen)return;this.bagSeen=true;try{localStorage.setItem('No2Arcade:bag-seen','1')}catch{}}
  prevSet(){this.bagSeenNow();this.set=(this.set+this.sets()-1)%this.sets();this.lift=null;this.key='';g.No2?.renderHub?.();this.draw();this.paintNote();return this.ids().at(-1)}
  // The luggage tag on the backpack says how many notebooks wait in it, written in her blue ballpoint; while nudging,
  // the lifted-notebook frame (rect in painting pixels) fades in as it rises.
  // The calendar page: today's month and day in her blue ballpoint (the month in the chosen language).
  // The swap stickers on her door, drawn over the painting: the bare door where the old stickers were, then each sticker,
  // or while it is not earned an empty die-cut spot (its outline left on the door), larger and lifted when chosen.
  stickerArt(id){this.stickerIms=this.stickerIms||{};let im=this.stickerIms[id];if(!im){im=new Image();im.onload=()=>this.draw();im.src=(g.No2Stickers||[]).find(k=>k.id===id)?.art||'';this.stickerIms[id]=im}return im.complete&&im.naturalWidth?im:null}
  stickerSpot(im){this.spots=this.spots||new Map();let c=this.spots.get(im);if(c)return c;c=document.createElement('canvas');c.width=im.naturalWidth+16;c.height=im.naturalHeight+16;const q=c.getContext('2d');
    // a faint outline: the sticker's shape a little larger in a darker wash, then the paler backing inside it
    const sil=col=>{const t=document.createElement('canvas');t.width=c.width;t.height=c.height;const tq=t.getContext('2d');tq.drawImage(im,8,8);tq.globalCompositeOperation='source-in';tq.fillStyle=col;tq.fillRect(0,0,t.width,t.height);return t};
    const dark=sil('rgba(52,44,82,.85)'),pale=sil('rgba(236,238,248,.3)');for(let a=0;a<16;a++)q.drawImage(dark,Math.cos(a*Math.PI/8)*5,Math.sin(a*Math.PI/8)*5);q.globalCompositeOperation='destination-out';for(let a=0;a<16;a++)q.drawImage(sil('#000'),Math.cos(a*Math.PI/8)*1.5,Math.sin(a*Math.PI/8)*1.5);q.globalCompositeOperation='source-over';q.drawImage(pale,0,0);
    this.spots.set(im,c);return c}
  paintStickers(x,v){if(this.ace)return;if(!this.doorBare){const im=new Image();im.onload=()=>this.draw();im.src='@@asset:assets/ui/stickers/door-bare.webp@@';this.doorBare=im}const B=this.doorBare,P=g.LockerPull?.doorBare;
    if(B.complete&&B.naturalWidth&&P)x.drawImage(B,v.x+P.x*v.s,v.y+P.y*v.s,P.w*v.s,P.h*v.s);
    const owned=k=>g.No2StickerOwned?.(k),on=this.lift==='stickers'&&!this.openBook;
    const all=g.No2Stickers||[],door=g.No2DoorStickers?.()||[],todo=all.filter(k=>!owned(k));
    for(const [i,d] of DOOR_STICKERS.entries()){const k=door[i]?all.find(q=>q.id===door[i]):todo[i-door.length],im=k&&this.stickerArt(k.id);if(!k||!im)continue;const got=owned(k),h=d.h*v.s*(on?1.06:1),w=h*im.naturalWidth/im.naturalHeight;
      x.save();x.translate(v.x+d.x*v.s+w/2,v.y+d.y*v.s+h/2-(on&&got?6*v.s:0));x.rotate(d.r);
      if(got){x.shadowColor='rgba(20,14,30,'+(on?.42:.3)+')';x.shadowBlur=(on?18:7)*v.s;x.shadowOffsetX=(on?6:3)*v.s;x.shadowOffsetY=(on?12:4)*v.s;x.drawImage(im,-w/2,-h/2,w,h)}
      else{const c=this.stickerSpot(im),k2=h/im.naturalHeight;x.globalAlpha=on?1:.85;x.drawImage(c,-w/2-8*k2,-h/2-8*k2,c.width*k2,c.height*k2)}
      x.restore()}}
  // A click on the stickers: the one under the pointer plays its sound (an empty spot a paper rustle). Painting pixels in.
  stickerSound(cx,cy){const v=this.view(),px=(cx-v.x)/v.s,py=(cy-v.y)/v.s,a=g.No2?.services?.audio;a?.unlock?.();
    const door=g.No2DoorStickers?.()||[],i=DOOR_STICKERS.findIndex((d,j)=>{const im=door[j]&&this.stickerArt(door[j]),w=im?d.h*im.naturalWidth/im.naturalHeight:d.h;return px>=d.x&&px<=d.x+w&&py>=d.y&&py<=d.y+d.h});if(i<0||!door[i])return;
    const k=(g.No2Stickers||[]).find(q=>q.id===door[i]),sfx=k?.sfx||DOOR_STICKERS.find(d=>d.id===door[i])?.sfx;if(!g.No2StickerOwned?.(k)||!sfx)return;const [game,type]=sfx.split('/');
    if(!a?.gameSample?.(game,{type,sticker:true}))Promise.resolve(a?.load?.('game',sfx)).then(()=>a?.gameSample?.(game,{type,sticker:true}),()=>{})}
  // APOLLO: her desk globe becomes the Moon. The map is NASA's LROC colour map of the whole Moon
  // (SVS CGI Moon Kit, public domain) repainted in the game's watercolor by Nano Banana with every mare and crater in
  // place (job globe-moon v2). It stands nearly upright (the Moon's axis leans 1.54 degrees to the ecliptic), shows its
  // near side at rest, turns once a minute while chosen (the real Moon takes 27.3 days) and is lit for tonight's phase:
  // the Sun's direction comes from the date (mean synodic month from the new moon of 2000-01-06 18:14 UTC), waxing
  // lit on the right, with a little earthshine on the dark side. Reduced motion holds it still.
  moonOn(){return !this.ace&&g.No2?.services?.save?.settings?.moonGlobe===true}
  moonPhase(){const days=(Date.now()-Date.UTC(2000,0,6,18,14))/864e5,f=((days/29.530588853)%1+1)%1;return f}
  drawMoon(x,v,t){const G=g.LockerPull?.globe3d;if(!G)return;if(!this.moonMap&&!this.moonLoading){this.moonLoading=true;const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const q=c.getContext('2d');q.drawImage(im,0,0);this.moonMap={w:im.width,h:im.height,d:q.getImageData(0,0,im.width,im.height).data};this.draw()};im.src='@@asset:assets/ui/locker-pull/moon-map.webp@@'}
    const M=this.moonMap;if(!M)return;if(g.No2?.services?.save?.settings?.reduced)t=0;
    const [bx,by,bw,bh]=G.ball,d=[v.x+bx*v.s,v.y+by*v.s,bw*v.s,bh*v.s],n=Math.max(64,Math.min(480,Math.round(d[2]*(g.devicePixelRatio||1)*1.6)));
    if(!this.moonBuf||this.moonBuf.n!==n){const c=document.createElement('canvas');c.width=c.height=n;const q=c.getContext('2d'),img=q.createImageData(n,n),geo=new Float32Array(n*n*4),tl=.0269,ct=Math.cos(tl),st=Math.sin(tl);
      for(let y=0;y<n;y++)for(let x=0;x<n;x++){const u=(x+.5)/n*2-1,w=(y+.5)/n*2-1,r2=u*u+w*w,k=(y*n+x)*4;if(r2>1){geo[k]=NaN;continue}const z=Math.sqrt(1-r2),uu=u*ct+w*st,vv=-u*st+w*ct;
       geo[k]=Math.atan2(uu,z);geo[k+1]=Math.asin(Math.max(-1,Math.min(1,vv)));geo[k+2]=u;geo[k+3]=z}
      this.moonBuf={n,c,q,img,geo}}
    /* the finished ball is kept until its turn, size or the hour's phase changes: a redraw at rest costs one drawImage */const ph=this.moonPhase(),key=n+'|'+Math.round(t*30)+'|'+Math.round(ph*708);if(this.moonBuf.key===key){x.save();x.drawImage(this.moonBuf.c,...d);if(this.globeRim)x.drawImage(this.globeRim,v.x+G.rim[0]*v.s,v.y+G.rim[1]*v.s,G.rim[2]*v.s,G.rim[3]*v.s);x.restore();return}this.moonBuf.key=key;
    const B=this.moonBuf,px=B.img.data,lon0=Math.PI-t*2*Math.PI/60,th=2*Math.PI*ph,sx=Math.sin(th),sz=-Math.cos(th);
    for(let i=0;i<n*n;i++){const k=i*4,o=i*4,lo=B.geo[k];if(lo!==lo){px[o+3]=0;continue}let L=(lo+lon0)/(2*Math.PI);L-=Math.floor(L);const la=B.geo[k+1],tx=Math.min(M.w-1,L*M.w|0),ty=Math.min(M.h-1,Math.max(0,(.5+la/Math.PI)*M.h|0)),tt=(ty*M.w+tx)*4,
      u=B.geo[k+2],z=B.geo[k+3],lam=u*sx+z*sz,lit=Math.max(0,Math.min(1,(lam+.06)/.16)),sh=.78+.22*z,dk=1-lit;
      /* the dark side in a dim blue ink wash (earthshine), never flat black */px[o]=(M.d[tt]*(lit+.2*dk)+36*dk)*sh;px[o+1]=(M.d[tt+1]*(lit+.2*dk)+42*dk)*sh;px[o+2]=(M.d[tt+2]*(lit+.22*dk)+68*dk)*sh;px[o+3]=255}
    B.q.putImageData(B.img,0,0);x.save();x.imageSmoothingQuality='high';x.drawImage(B.c,...d);if(this.globeRim)x.drawImage(this.globeRim,v.x+G.rim[0]*v.s,v.y+G.rim[1]*v.s,G.rim[2]*v.s,G.rim[3]*v.s);x.restore()}
  paintCalendar(x,v){const d=new Date(),L=g.No2I18n?.lang||'en';let mon='';try{mon=d.toLocaleDateString({en:'en-US',fr:'fr-FR',es:'es-ES',de:'de-DE',it:'it-IT'}[L]||'en-US',{month:'short'}).replace('.','')}catch{}
    x.save();x.translate(v.x+3466*v.s,v.y+785*v.s);x.rotate(-.03);x.fillStyle='#1f3a6b';x.textAlign='center';x.textBaseline='middle';
    x.font=Math.round(44*v.s)+'px Hand, Schoolhand, sans-serif';x.fillText(mon,0,-62*v.s);x.font=Math.round(120*v.s)+'px Hand, Schoolhand, sans-serif';x.fillText(String(d.getDate()),0,22*v.s);x.restore()}
  // His jacket's tag says how many of his notebooks wait in it, scrawled in his black marker, like her bag's tag.
  paintAceTag(x,v){const more=g.No2Catalog.notebooks.length-this.ids().length;if(more<=0)return;
    x.save();x.translate(v.x+1800*v.s,v.y+2432*v.s);x.rotate(-.12);x.fillStyle='#1b1a1f';x.textAlign='center';x.textBaseline='middle';
    x.font=Math.round(58*v.s)+'px SchoolMarker, Hand, sans-serif';x.fillText('+'+more,0,-22*v.s);x.font=Math.round(34*v.s)+'px SchoolMarker, Hand, sans-serif';x.fillText('more',2*v.s,30*v.s);x.restore()}
  paintBag(x,v){const k=this.nudgeT;if(k>=0&&this.bagPeekArt){const a=Math.sin(Math.min(1,k)*Math.PI),rise=(1-a)*30,P=BAG_PEEK;
      x.save();x.globalAlpha=a;x.beginPath();x.rect(v.x+P.x*v.s,v.y+P.y*v.s,P.w*v.s,(P.h-6)*v.s);x.clip();x.drawImage(this.bagPeekArt,v.x+P.x*v.s,v.y+(P.y+rise)*v.s,P.w*v.s,P.h*v.s);x.restore()}
    const more=g.No2Catalog.notebooks.length-this.ids().length;if(more<=0)return;
    x.save();x.translate(v.x+2090*v.s,v.y+2508*v.s);x.rotate(-.74);x.fillStyle='#1f3a6b';x.textAlign='center';x.textBaseline='middle';
    x.font=Math.round(82*v.s)+'px Hand, Schoolhand, sans-serif';x.fillText('+'+more,0,-26*v.s);x.font=Math.round(50*v.s)+'px Hand, Schoolhand, sans-serif';x.fillText('more',0,40*v.s);x.restore()}
  async openBag(){this.bagSeenNow();this.set=(this.set+1)%this.sets();this.lift=null;this.key='';g.No2?.renderHub?.();const first=this.ids()[0];$('desk-backpack')?.focus({preventScroll:true});this.draw();this.paintNote();return first}
  closeBag(){}
  bagSelect(){return Promise.resolve()}
  selectedBagId(){return this.ids()[0]}
  info(){return{backend:'canvas 2d',hub:'locker',set:this.set}}
}
// Each notebook's hand-lettered title (titles-pilot and titles-a..e), packed once: the left page's name
// below and the locker sheets that name a game (host.js, No2TitleArt) share it.
const TITLE_ART={'scribble-defender':'@@asset:assets/ui/titles/scribble-defender.webp@@','gym-class-pong':'@@asset:assets/ui/titles/gym-class-pong.webp@@','detention-breakout':'@@asset:assets/ui/titles/detention-breakout.webp@@','space-substitutes':'@@asset:assets/ui/titles/space-substitutes.webp@@','erasteroids':'@@asset:assets/ui/titles/erasteroids.webp@@','lunch-lander':'@@asset:assets/ui/titles/lunch-lander.webp@@','spitball-command':'@@asset:assets/ui/titles/spitball-command.webp@@','snack-man':'@@asset:assets/ui/titles/snack-man.webp@@','recess-zone':'@@asset:assets/ui/titles/recess-zone.webp@@','galgebra':'@@asset:assets/ui/titles/galgebra.webp@@','centigrade':'@@asset:assets/ui/titles/centigrade.webp@@','froggology':'@@asset:assets/ui/titles/froggology.webp@@','quiz':'@@asset:assets/ui/titles/quiz.webp@@','testpest':'@@asset:assets/ui/titles/testpest.webp@@','home-ec-scramble':'@@asset:assets/ui/titles/home-ec-scramble.webp@@','dunce-kong':'@@asset:assets/ui/titles/dunce-kong.webp@@','dig-doug':'@@asset:assets/ui/titles/dig-doug.webp@@','q-nerd':'@@asset:assets/ui/titles/q-nerd.webp@@','jock-joust':'@@asset:assets/ui/titles/jock-joust.webp@@','class-of-2084':'@@asset:assets/ui/titles/class-of-2084.webp@@','mystery-meat-time':'@@asset:assets/ui/titles/mystery-meat-time.webp@@','hall-patrol':'@@asset:assets/ui/titles/hall-patrol.webp@@','term-paperboy':'@@asset:assets/ui/titles/term-paperboy.webp@@','locker-gauntlet':'@@asset:assets/ui/titles/locker-gauntlet.webp@@'};g.No2TitleArt=TITLE_ART;
// Art the stylesheet below uses more than once, packed once.
const ERAST_SHIP='@@asset:assets/erasteroids/ship.webp@@',ERAST_ROCK_A='@@asset:assets/erasteroids/rock-a.webp@@',INK_UNDERLINE='@@asset:assets/ui/ink-underline.webp@@',INK_ARROW='@@asset:assets/ui/ink-arrow.webp@@',TAPE_A='@@asset:assets/ui/tape-a.webp@@',RULER='@@asset:assets/ui/ruler.webp@@',TAPE_B='@@asset:assets/ui/tape-b.webp@@';
const LOCKER_CSS=`body.locker-hub #page-tabs{position:fixed!important;inset:0!important;width:auto!important;height:auto!important;max-height:none!important;pointer-events:none;display:block!important}
body.locker-hub #page-tabs button{position:fixed!important;pointer-events:auto;background:none!important;background-image:none!important;clip-path:none!important;translate:none!important;transform:none!important;max-width:none!important;margin:0!important;padding:0!important;display:flex;align-items:center;justify-content:center;font-family:Hand,Schoolhand!important;font-size:clamp(16px,1.3vw,30px)!important;color:#fffaf0!important;text-shadow:0 1px 2px #1f2f4dcc,0 0 3px #1f2f4d99;text-align:center}
body.locker-hub #page-tabs button[aria-current=page]{text-decoration:underline;text-underline-offset:.2em}
body.locker-hub #page-tabs button:focus-visible{outline:2px solid #ffe7a8;outline-offset:2px}
body.locker-hub #book-chrome{justify-content:space-between}
body.locker-hub.tabs-hidden #page-tabs{visibility:hidden}
body.locker-hub #paper-page{background-image:none!important}
body.locker-hub #paper-page::before{display:none!important}

body.locker-hub #paper-content{inset:0!important}
#nb-left{position:fixed;z-index:5;pointer-events:none}
.page-flip{position:fixed;inset:0;z-index:6;pointer-events:none;perspective:2400px}.page-flip>.flip-page{position:fixed}.flip-page{position:absolute;overflow:hidden;isolation:isolate}.flip-page>canvas{position:absolute;inset:0;width:100%;height:100%}.flip-strip{position:absolute;top:0;transform-style:preserve-3d}.flip-side{position:absolute;inset:0;overflow:hidden;backface-visibility:hidden}.flip-shade{position:absolute;inset:0;opacity:0;pointer-events:none;background:#1e1830}
body.locker-hub #opening-note{inset:45% 30% auto!important;background:none!important;box-shadow:none!important;transform:rotate(-2deg)!important;font-family:Hand,Schoolhand!important;font-size:clamp(20px,2vw,38px)!important;color:#1f3a6b!important}
/* Erasteroids' left page: her own game sprites (eraser rocks, the paper ship, saucers) as doodles; its title page has her research sketches (block below). */
/* Hard mode in neon, white and neon colours on black (a textured black art paper was too distracting): plain matte black
   paper behind the game, and #hard-neon on the game layer: colours lifted to neon, a white edge and a soft white glow round
   every piece so small text and thin lines read on black. Term Paperboy paints its own street and keeps it. */
body.hard-run #game-mount>*:not(.tracing-sheet){background:radial-gradient(ellipse at 50% 40%,#1a1a1d 0%,#0e0e10 70%,#0a0a0b 100%);border-radius:6px;box-shadow:0 0 0 2px #070708,0 6px 18px rgba(0,0,0,.45)}
body.hard-run #game-mount canvas{filter:url(#hard-neon)}
/* Arcade cabinet mode (the Konami code): the game on a glowing CRT, only while playing. Dark curved glass behind it,
   her inks turned to phosphor light (#hard-neon) with a soft bloom, scanlines and a vignette over it. Display only. */
body.crt-run #game-mount>*:not(.tracing-sheet){background:radial-gradient(ellipse at 50% 45%,#0f1a14 0%,#070b09 75%,#030504 100%)!important;border-radius:18px/14px;box-shadow:0 0 0 3px #111,0 0 0 9px #2a2a2c,0 10px 26px rgba(0,0,0,.55);overflow:hidden;position:relative}
body.crt-run #game-mount canvas{filter:url(#hard-neon) brightness(1.08) drop-shadow(0 0 3px rgba(190,255,230,.35))}
body.crt-run[data-notebook=term-paperboy] #game-mount canvas{filter:saturate(1.3) contrast(1.1) brightness(1.05)}
body.crt-run #game-mount>*:not(.tracing-sheet)::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:5;border-radius:inherit;
 background:repeating-linear-gradient(to bottom,rgba(0,0,0,.28) 0 1px,transparent 1px 3px),radial-gradient(ellipse at 50% 50%,transparent 58%,rgba(0,0,0,.55) 100%);
 box-shadow:inset 0 0 40px rgba(0,0,0,.6),inset 0 0 6px rgba(160,255,220,.18);animation:crt-flicker 6s steps(60) infinite}
@keyframes crt-flicker{0%,100%{opacity:1}50%{opacity:.94}}
.reduce-motion body.crt-run #game-mount>*:not(.tracing-sheet)::after,body.reduce-motion.crt-run #game-mount>*:not(.tracing-sheet)::after{animation:none}
body.hard-run[data-notebook=term-paperboy] #game-mount canvas{filter:saturate(1.35) contrast(1.08)}
body[data-notebook=erasteroids][data-view=notes] #paper-page::before{background-image:url(${ERAST_SHIP}),url(@@asset:assets/erasteroids/rock-b.webp@@),url(@@asset:assets/erasteroids/saucer-big.webp@@)}
body[data-notebook=erasteroids][data-view=scores] #paper-page::before{background-image:url(@@asset:assets/erasteroids/saucer-small.webp@@),url(@@asset:assets/erasteroids/rock-d.webp@@),url(${ERAST_SHIP})}
body[data-notebook=erasteroids][data-view=back] #paper-page::before{background-image:url(@@asset:assets/erasteroids/rock-c.webp@@),url(@@asset:assets/erasteroids/crumb-2.webp@@),url(${ERAST_ROCK_A})}
/* Notebooks without a game yet: three of her doodles about that game on the left page (nb-doodles-1..6). Doodles a and b are
   named once (--doodle-a, --doodle-b) because the title page's research block below shows them too. */
body[data-notebook=gym-class-pong] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/gym-class-pong-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/gym-class-pong-b.webp@@)}body[data-notebook=gym-class-pong] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/gym-class-pong-c.webp@@)}
body[data-notebook=detention-breakout] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/detention-breakout-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/detention-breakout-b.webp@@)}body[data-notebook=detention-breakout] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/detention-breakout-c.webp@@)}
body[data-notebook=space-substitutes] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/space-substitutes-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/space-substitutes-b.webp@@)}body[data-notebook=space-substitutes] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/space-substitutes-c.webp@@)}
body[data-notebook=lunch-lander] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/lunch-lander-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/lunch-lander-b.webp@@)}body[data-notebook=lunch-lander] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/lunch-lander-c.webp@@)}
body[data-notebook=spitball-command] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/spitball-command-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/spitball-command-b.webp@@)}body[data-notebook=spitball-command] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/spitball-command-c.webp@@)}
body[data-notebook=snack-man] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/snack-man-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/snack-man-b.webp@@)}body[data-notebook=snack-man] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/snack-man-c.webp@@)}
body[data-notebook=recess-zone] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/recess-zone-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/recess-zone-b.webp@@)}body[data-notebook=recess-zone] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/recess-zone-c.webp@@)}
body[data-notebook=galgebra] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/galgebra-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/galgebra-b.webp@@)}body[data-notebook=galgebra] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/galgebra-c.webp@@)}
body[data-notebook=centigrade] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/centigrade-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/centigrade-b.webp@@)}body[data-notebook=centigrade] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/centigrade-c.webp@@)}
body[data-notebook=froggology] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/froggology-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/froggology-b.webp@@)}body[data-notebook=froggology] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/froggology-c.webp@@)}
body[data-notebook=quiz] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/quiz-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/quiz-b.webp@@)}body[data-notebook=quiz] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/quiz-c.webp@@)}
body[data-notebook=testpest] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/testpest-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/testpest-b.webp@@)}body[data-notebook=testpest] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/testpest-c.webp@@)}
body[data-notebook=home-ec-scramble] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/home-ec-scramble-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/home-ec-scramble-b.webp@@)}body[data-notebook=home-ec-scramble] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/home-ec-scramble-c.webp@@)}
body[data-notebook=dunce-kong] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/dunce-kong-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/dunce-kong-b.webp@@)}body[data-notebook=dunce-kong] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/dunce-kong-c.webp@@)}
body[data-notebook=dig-doug] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/dig-doug-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/dig-doug-b.webp@@)}body[data-notebook=dig-doug] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/dig-doug-c.webp@@)}
body[data-notebook=q-nerd] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/q-nerd-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/q-nerd-b.webp@@)}body[data-notebook=q-nerd] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/q-nerd-c.webp@@)}
body[data-notebook=jock-joust] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/jock-joust-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/jock-joust-b.webp@@)}body[data-notebook=jock-joust] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/jock-joust-c.webp@@)}
body[data-notebook=class-of-2084] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/class-of-2084-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/class-of-2084-b.webp@@)}body[data-notebook=class-of-2084] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/class-of-2084-c.webp@@)}
body[data-notebook=mystery-meat-time] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/mystery-meat-time-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/mystery-meat-time-b.webp@@)}body[data-notebook=mystery-meat-time] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/mystery-meat-time-c.webp@@)}
body[data-notebook=hall-patrol] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/hall-patrol-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/hall-patrol-b.webp@@)}body[data-notebook=hall-patrol] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/hall-patrol-c.webp@@)}
body[data-notebook=term-paperboy] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/term-paperboy-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/term-paperboy-b.webp@@)}body[data-notebook=term-paperboy] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/term-paperboy-c.webp@@)}
body[data-notebook=locker-gauntlet] #paper-page{--doodle-a:url(@@asset:assets/ui/doodles/locker-gauntlet-a.webp@@);--doodle-b:url(@@asset:assets/ui/doodles/locker-gauntlet-b.webp@@)}body[data-notebook=locker-gauntlet] #paper-page::before{background-image:var(--doodle-a),var(--doodle-b),url(@@asset:assets/ui/doodles/locker-gauntlet-c.webp@@)}
/* research-sketches:start (her working studies on the title page; tools/research-css.py writes this block) */
#paper-content .title-research{display:none;width:var(--rw,78%);max-width:100%;margin:.2em auto 0;background:center/contain no-repeat;mix-blend-mode:multiply;transform:rotate(-1.2deg)}
body[data-notebook=centigrade][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/centigrade-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/centigrade-e.webp@@),var(--doodle-b)}
body[data-notebook=centigrade] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/centigrade-f.webp@@);aspect-ratio:513/640;--rw:35%}
body[data-notebook=class-of-2084][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/class-of-2084-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/class-of-2084-e.webp@@),var(--doodle-b)}
body[data-notebook=class-of-2084] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/class-of-2084-f.webp@@);aspect-ratio:432/640;--rw:30%}
body[data-notebook=detention-breakout][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/detention-breakout-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/detention-breakout-e.webp@@),var(--doodle-b)}
body[data-notebook=detention-breakout] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/detention-breakout-f.webp@@);aspect-ratio:554/640;--rw:38%}
body[data-notebook=dig-doug][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/dig-doug-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/dig-doug-e.webp@@),var(--doodle-b)}
body[data-notebook=dig-doug] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/dig-doug-f.webp@@);aspect-ratio:640/396;--rw:62%}
body[data-notebook=dunce-kong][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/dunce-kong-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/dunce-kong-e.webp@@),var(--doodle-b)}
body[data-notebook=dunce-kong] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/dunce-kong-f.webp@@);aspect-ratio:610/640;--rw:42%}
body[data-notebook=erasteroids][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/erasteroids-d.webp@@),url(${ERAST_ROCK_A}),url(@@asset:assets/ui/doodles/erasteroids-e.webp@@),url(@@asset:assets/erasteroids/ship-thrust.webp@@)}
body[data-notebook=erasteroids] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/erasteroids-f.webp@@);aspect-ratio:640/603;--rw:47%}
body[data-notebook=froggology][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/froggology-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/froggology-e.webp@@),var(--doodle-b)}
body[data-notebook=froggology] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/froggology-f.webp@@);aspect-ratio:581/640;--rw:40%}
body[data-notebook=galgebra][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/galgebra-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/galgebra-e.webp@@),var(--doodle-b)}
body[data-notebook=galgebra] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/galgebra-f.webp@@);aspect-ratio:640/553;--rw:51%}
body[data-notebook=gym-class-pong][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/gym-class-pong-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/gym-class-pong-e.webp@@),var(--doodle-b)}
body[data-notebook=gym-class-pong] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/gym-class-pong-f.webp@@);aspect-ratio:640/201;--rw:62%}
body[data-notebook=hall-patrol][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/hall-patrol-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/hall-patrol-e.webp@@),var(--doodle-b)}
body[data-notebook=hall-patrol] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/hall-patrol-f.webp@@);aspect-ratio:640/212;--rw:62%}
body[data-notebook=home-ec-scramble][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/home-ec-scramble-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/home-ec-scramble-e.webp@@),var(--doodle-b)}
body[data-notebook=home-ec-scramble] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/home-ec-scramble-f.webp@@);aspect-ratio:478/640;--rw:33%}
body[data-notebook=jock-joust][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/jock-joust-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/jock-joust-e.webp@@),var(--doodle-b)}
body[data-notebook=jock-joust] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/jock-joust-f.webp@@);aspect-ratio:523/640;--rw:36%}
body[data-notebook=locker-gauntlet][data-view=title] #paper-page::before{background-image:var(--doodle-a),url(@@asset:assets/ui/doodles/locker-gauntlet-e.webp@@),var(--doodle-b)}
body[data-notebook=locker-gauntlet] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/locker-gauntlet-f.webp@@);aspect-ratio:640/518;--rw:54%}
body[data-notebook=lunch-lander][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/lunch-lander-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/lunch-lander-e.webp@@),var(--doodle-b)}
body[data-notebook=lunch-lander] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/lunch-lander-f.webp@@);aspect-ratio:640/590;--rw:48%}
body[data-notebook=mystery-meat-time][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/mystery-meat-time-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/mystery-meat-time-e.webp@@),var(--doodle-b)}
body[data-notebook=mystery-meat-time] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/mystery-meat-time-f.webp@@);aspect-ratio:640/621;--rw:45%}
body[data-notebook=q-nerd][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/q-nerd-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/q-nerd-e.webp@@),var(--doodle-b)}
body[data-notebook=q-nerd] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/q-nerd-f.webp@@);aspect-ratio:599/640;--rw:41%}
body[data-notebook=quiz][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/quiz-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/quiz-e.webp@@),var(--doodle-b)}
body[data-notebook=quiz] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/quiz-f.webp@@);aspect-ratio:546/640;--rw:38%}
body[data-notebook=recess-zone][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/recess-zone-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/recess-zone-e.webp@@),var(--doodle-b)}
body[data-notebook=recess-zone] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/recess-zone-f.webp@@);aspect-ratio:640/472;--rw:60%}
body[data-notebook=scribble-defender][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/scribble-defender-d.webp@@),url(@@asset:assets/ui/nb-star.webp@@),url(@@asset:assets/ui/doodles/scribble-defender-e.webp@@),url(@@asset:assets/ui/nb-spot.webp@@)}
body[data-notebook=scribble-defender] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/scribble-defender-f.webp@@);aspect-ratio:596/640;--rw:41%}
body[data-notebook=snack-man][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/snack-man-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/snack-man-e.webp@@),var(--doodle-b)}
body[data-notebook=snack-man] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/snack-man-f.webp@@);aspect-ratio:640/499;--rw:56%}
body[data-notebook=space-substitutes][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/space-substitutes-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/space-substitutes-e.webp@@),var(--doodle-b)}
body[data-notebook=space-substitutes] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/space-substitutes-f.webp@@);aspect-ratio:309/640;--rw:21%}
body[data-notebook=spitball-command][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/spitball-command-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/spitball-command-e.webp@@),var(--doodle-b)}
body[data-notebook=spitball-command] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/spitball-command-f.webp@@);aspect-ratio:593/640;--rw:41%}
body[data-notebook=term-paperboy][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/term-paperboy-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/term-paperboy-e.webp@@),var(--doodle-b)}
body[data-notebook=term-paperboy] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/term-paperboy-f.webp@@);aspect-ratio:640/637;--rw:44%}
body[data-notebook=testpest][data-view=title] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/testpest-d.webp@@),var(--doodle-a),url(@@asset:assets/ui/doodles/testpest-e.webp@@),var(--doodle-b)}
body[data-notebook=testpest] #paper-content .title-research{display:block;background-image:url(@@asset:assets/ui/doodles/testpest-f.webp@@);aspect-ratio:492/640;--rw:34%}
/* research-sketches:end */
/* Comic controls on the dark reading background: no cream pills; the key glyph keeps its own width, the word sits beside it. */
body.locker-hub .device-glyph{width:auto!important;min-width:0!important;flex:none}
body.locker-hub :is(.motion-skip,.motion-controls button) .device-glyph{mix-blend-mode:normal!important}
body.locker-hub :is(.motion-skip,.motion-controls button){background:#2b2633d9!important;border:0!important;box-shadow:0 2px 8px #0006!important;border-radius:10px!important;display:inline-flex!important;align-items:center;gap:.45em;color:#f3ecdc!important;font-family:Hand,Schoolhand,sans-serif!important;text-shadow:0 1px 2px #000a;padding:.25em .6em!important} body.locker-hub :is(.motion-skip,.motion-controls,.motion-controls button)[hidden]{display:none!important}
/* Dialogs: a sheet torn out of the notebook, taped, over the dimmed locker; ballpoint controls. */
body.locker-hub #desk-dialog:not(.backpack-dialog){border-image:none!important;border:0!important;background:url(@@asset:assets/ui/dlg-sheet.webp@@) center/100% 100% no-repeat!important;padding:6.5% calc(min(84vw,1240px) * .0775) 5% calc(min(84vw,1240px) * .19)!important;width:min(84vw,1240px)!important;max-width:none!important;max-height:94vh!important;overflow:visible!important;font-size:clamp(16px,1.35vw,26px)!important;filter:drop-shadow(4px 10px 14px #1a142888)}
body.locker-hub #desk-dialog:not(.backpack-dialog)::backdrop{background:#1a162840}
body.locker-hub #desk-dialog #dialog-kicker{display:none}
body.locker-hub #desk-dialog #dialog-title{font-family:Marker,SchoolMarker!important;font-size:1.55em!important;color:#243543!important;margin:0 0 .4em!important;white-space:nowrap}
/* The words start right of the sheet's red margin (the margin is at 15.5 to 16.6% of the sheet, the words start at 19%); the title still centres on the paper: its box reaches as far left as the right padding. */
#desk-dialog:not(.backpack-dialog):not([data-screen=pause]) #dialog-title{margin-left:calc(min(84vw,1240px) * -.1125)!important}
body.locker-hub #desk-dialog #dialog-title::before{width:1.4em;height:1.4em}
body.locker-hub #desk-dialog #dialog-close{background:url(${INK_UNDERLINE}) 100% 100%/45% 30% no-repeat!important;padding:.1em .3em .35em!important;font-family:Hand,Schoolhand!important;color:#1f3a6b!important}
body.locker-hub #desk-dialog button:not(#dialog-close){border-image:none!important;border:0!important;background:none!important;font-family:Hand,Schoolhand!important;color:#1f3a6b!important;padding:.3em .6em!important;text-align:left}
body.locker-hub #desk-dialog .options{display:grid!important;grid-template-columns:1fr 1fr!important;gap:.1em 1.5em!important;font-size:.92em}
body.locker-hub #desk-dialog .options button:not(#dialog-close)[aria-pressed]{white-space:nowrap}
body.locker-hub #desk-dialog .options button:not(#dialog-close){min-height:0!important;height:auto!important;padding:.25em .2em .25em 2.1em!important;background:url(@@asset:assets/ui/ink-box-empty.webp@@) left center/1.5em auto no-repeat!important}
body.locker-hub #desk-dialog .options button:not(#dialog-close)[aria-pressed=true]{background-image:url(@@asset:assets/ui/ink-box-checked.webp@@)!important}
body.locker-hub #desk-dialog .options button:not(#dialog-close):not([aria-pressed]){background-image:url(${INK_ARROW})!important;background-size:1.4em auto!important}
body.locker-hub #desk-dialog .actions button:not(#dialog-close){background:url(${INK_UNDERLINE}) center bottom/95% 34% no-repeat!important}
body.locker-hub #desk-dialog button:is(:hover,:focus-visible){outline:0;filter:drop-shadow(0 0 6px #ffe7a8)}
body.locker-hub #desk-dialog #dialog-close{display:inline-flex!important;gap:.35em;align-items:center}
/* Esc key in the paper's left margin with its word underneath; the title centred and prominent at the top. */
body.locker-hub #desk-dialog #dialog-close{float:none!important;position:absolute!important;left:5.6%!important;top:21%!important;width:7.4%!important;flex-direction:column!important;align-items:center!important;gap:.15em!important;margin:0!important;background-position:50% 100%!important;background-size:80% 22%!important;font-size:1.1em!important}
body.locker-hub #desk-dialog #dialog-close .device-glyph{margin:0!important}
body.locker-hub #desk-dialog #dialog-title{justify-content:center!important;text-align:center;font-size:2.2em!important;margin:0 0 .5em!important}
body.locker-hub :is(#dialog-close,#close-book) .device-glyph{width:auto!important;min-width:0!important;margin-right:.3em}
body.locker-hub :is(#dialog-close,#close-book){white-space:nowrap}
body.locker-hub #desk-dialog select{border-image:none!important;box-shadow:none!important;outline:0;font-family:Hand,Schoolhand!important;font-size:1em!important;color:#1f3a6b!important;background:url(@@asset:assets/ui/ink-chevron.webp@@) right .3em center/1em auto no-repeat,transparent!important;border:0!important;border-bottom:2px solid #1f3a6b88!important;border-radius:0!important;padding:.15em 1.8em .15em .2em!important;appearance:none}
body.locker-hub #desk-dialog :is(p,li,td,span){color:#243543}
#nb-left .nb-name{position:absolute;left:8%;right:6%;top:6%;font-family:Marker,SchoolMarker;color:#243543;line-height:1.05;transform:rotate(-2deg)}
body.locker-hub #paper-content.page-title h1{display:none}
body.locker-hub #paper-content h1{font-size:calc(var(--pagew) * .075)!important;line-height:1.1!important;margin:.15em 0 .5em!important;color:#243543}
body.locker-hub #paper-content .page-actions{gap:1.6em!important;margin-top:1.2em!important;flex-wrap:wrap}
body.locker-hub .glyph-cheat .device-glyph{min-width:6.6em!important}
body.locker-hub .glyph-cheat{line-height:1.15;overflow:visible;margin:.08em 0!important}
body.locker-hub #paper-content .cheat-card{font-size:calc(var(--pagew) * .047)!important}
body.locker-hub #paper-content .cheat-card p{margin:.12em 0!important}
body.locker-hub .ink-key{height:2.05em!important;padding-bottom:.32em!important}
body.locker-hub #paper-content p.title-note{font-size:calc(var(--pagew) * .062)!important;line-height:1.3!important;margin:1em 0 .2em!important}
body.locker-hub #close-book{border-image:none!important;border:0!important;font-family:Hand,Schoolhand!important}
body.locker-hub #close-book:is(:hover,:focus-visible){outline:0;filter:drop-shadow(0 0 5px #ffe7a8)}
body.locker-hub #book-breadcrumb{background:none!important;color:#243543!important}
body.locker-hub #paper-content .page-actions button{border-image:none!important;border:0!important;background:none!important;font-family:Hand,Schoolhand!important;font-size:calc(var(--pagew) * .05)!important;color:#1f3a6b!important;padding:.45em 1.1em!important;position:relative}
/* The main page action is written on a band of white correction tape, like the tags and keys. */
body.locker-hub #paper-content .page-actions button.primary{background:url(${TAPE_A}) center/100% 100% no-repeat!important;padding:.45em 1.3em .55em!important;filter:drop-shadow(2px 3px 4px #1e18304a)}
body.locker-hub #paper-content .page-actions button:not(.primary){background:url(${INK_UNDERLINE}) center bottom/95% 38% no-repeat!important}
body.locker-hub #paper-content .page-actions button:is(:hover,:focus-visible){translate:0 -2px;outline:0;filter:drop-shadow(0 0 6px #ffe7a8)}
body.locker-hub #paper-content .page-actions button:is(:hover,:focus-visible)::before{content:'';position:absolute;left:-1.6em;top:50%;width:1.3em;height:.6em;translate:0 -50%;background:url(${INK_ARROW}) center/contain no-repeat}
#nb-left img{position:absolute;mix-blend-mode:multiply}
/* ===== UI type rules. Four sizes, scaled from 1080p; nothing smaller than meta. =====
   title  52 Permanent Marker  one per screen (dialog title, notebook name)
   body   30 Patrick Hand      running text, lists, cheat sheet lines
   control 26 Patrick Hand     every button, tab, close/back, prompt
   meta   22 Patrick Hand      page number, version, status */
:root{--u:min(calc(100vw / 1920),calc(100vh / 1080));--t-title:max(26px,calc(52 * var(--u)));--t-head:max(56px,calc(118 * var(--u)));--t-body:max(17px,calc(30 * var(--u)));--t-control:max(16px,calc(26 * var(--u)));--t-meta:max(14px,calc(22 * var(--u)));--ink:#243543;--pen:#1f3a6b}
body.locker-hub #paper-content,body.locker-hub #paper-content :is(p,li,span,b,i,strong,div){font-family:Hand,Schoolhand,sans-serif!important;font-size:var(--t-body)!important;line-height:1.45!important;color:var(--ink)}
body.locker-hub #nb-left .nb-name{font-size:var(--t-title)!important}
#nb-left .nb-name{top:3%!important;left:6%!important;right:6%!important;height:20%;font-size:0!important;color:transparent!important;background:center/contain no-repeat;transform:rotate(-1.5deg)!important}
body:is([data-notebook=gym-class-pong],[data-notebook=quiz]) #nb-left .nb-name{top:7%!important;height:18%}
/* Centred on the paper you see: the left page's visible paper runs past the box on the outer side, so the
   title sits 5.6% of the box to the left of the box's middle. */
body.locker-hub #nb-left .nb-name{left:.4%!important;right:11.6%!important}
/* Title page: her drawn preview of each game's screen (previews-a..f). */
/* Each preview is its own taped-on sheet (preview-taped): a little tilted, a soft shadow under the paper. */
#paper-content .title-preview{width:96%;margin:2% auto 1%;aspect-ratio:1.34;background:center/contain no-repeat;transform:rotate(var(--tilt,-1deg));filter:drop-shadow(1px 3px 3px #2d211c40)}
body[data-notebook=scribble-defender] #paper-content .title-preview{--tilt:-1.6deg}
body[data-notebook=gym-class-pong] #paper-content .title-preview{--tilt:1.2deg}
body[data-notebook=detention-breakout] #paper-content .title-preview{--tilt:-0.6deg}
body[data-notebook=space-substitutes] #paper-content .title-preview{--tilt:1.8deg}
body[data-notebook=erasteroids] #paper-content .title-preview{--tilt:-1.2deg}
body[data-notebook=lunch-lander] #paper-content .title-preview{--tilt:0.8deg}
body[data-notebook=spitball-command] #paper-content .title-preview{--tilt:-2deg}
body[data-notebook=snack-man] #paper-content .title-preview{--tilt:1.4deg}
body[data-notebook=recess-zone] #paper-content .title-preview{--tilt:-0.9deg}
body[data-notebook=galgebra] #paper-content .title-preview{--tilt:2deg}
body[data-notebook=centigrade] #paper-content .title-preview{--tilt:-1.4deg}
body[data-notebook=froggology] #paper-content .title-preview{--tilt:0.6deg}
body[data-notebook=quiz] #paper-content .title-preview{--tilt:-1.8deg}
body[data-notebook=testpest] #paper-content .title-preview{--tilt:1deg}
body[data-notebook=home-ec-scramble] #paper-content .title-preview{--tilt:-0.7deg}
body[data-notebook=dunce-kong] #paper-content .title-preview{--tilt:1.6deg}
body[data-notebook=dig-doug] #paper-content .title-preview{--tilt:-1.1deg}
body[data-notebook=q-nerd] #paper-content .title-preview{--tilt:0.9deg}
body[data-notebook=jock-joust] #paper-content .title-preview{--tilt:-1.5deg}
body[data-notebook=class-of-2084] #paper-content .title-preview{--tilt:1.3deg}
body[data-notebook=mystery-meat-time] #paper-content .title-preview{--tilt:-0.5deg}
body[data-notebook=hall-patrol] #paper-content .title-preview{--tilt:1.7deg}
body[data-notebook=term-paperboy] #paper-content .title-preview{--tilt:-1deg}
body[data-notebook=locker-gauntlet] #paper-content .title-preview{--tilt:0.7deg}

body[data-notebook=centigrade] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/centigrade.webp@@)}
body[data-notebook=class-of-2084] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/class-of-2084.webp@@)}
body[data-notebook=detention-breakout] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/detention-breakout.webp@@)}
body[data-notebook=dig-doug] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/dig-doug.webp@@)}
body[data-notebook=dunce-kong] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/dunce-kong.webp@@)}
body[data-notebook=erasteroids] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/erasteroids.webp@@)}
body[data-notebook=froggology] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/froggology.webp@@)}
body[data-notebook=galgebra] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/galgebra.webp@@)}
body[data-notebook=gym-class-pong] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/gym-class-pong.webp@@)}
body[data-notebook=hall-patrol] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/hall-patrol.webp@@)}
body[data-notebook=home-ec-scramble] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/home-ec-scramble.webp@@)}
body[data-notebook=jock-joust] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/jock-joust.webp@@)}
body[data-notebook=locker-gauntlet] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/locker-gauntlet.webp@@)}
body[data-notebook=lunch-lander] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/lunch-lander.webp@@)}
body[data-notebook=mystery-meat-time] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/mystery-meat-time.webp@@)}
body[data-notebook=q-nerd] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/q-nerd.webp@@)}
body[data-notebook=quiz] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/quiz.webp@@)}
body[data-notebook=recess-zone] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/recess-zone.webp@@)}
body[data-notebook=scribble-defender] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/scribble-defender.webp@@)}
body[data-notebook=snack-man] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/snack-man.webp@@)}
body[data-notebook=space-substitutes] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/space-substitutes.webp@@)}
body[data-notebook=spitball-command] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/spitball-command.webp@@)}
body[data-notebook=term-paperboy] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/term-paperboy.webp@@)}
body[data-notebook=testpest] #paper-content .title-preview{background-image:url(@@asset:assets/ui/previews/testpest.webp@@)}
body[data-notebook=scribble-defender] #paper-content .title-preview{width:70%;margin:0 auto}
/* Each notebook's title, hand lettered by her in the style of its game (titles-pilot and titles-a..e). */
${Object.entries(TITLE_ART).map(([id,u])=>`body[data-notebook=${id}] #nb-left .nb-name{background-image:url(${u})}`).join('\n')}

body.locker-hub #paper-content h1{font-family:Hand,Schoolhand,sans-serif!important;font-size:var(--t-body)!important;margin:0 0 .6em!important;text-decoration:underline;text-underline-offset:.25em}
body.locker-hub #paper-content:is(.page-notes,.page-scores,.page-title) h1{display:none!important}
body.locker-hub #paper-content p.title-note{font-size:var(--t-body)!important;margin:0 0 1.2em!important}
body.locker-hub #paper-content .page-actions{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:.9em!important;margin-top:.4em!important}
body.locker-hub #paper-content .page-actions button,body.locker-hub #paper-content .page-actions button.primary{font-size:var(--t-control)!important}
body.locker-hub #page-tabs button,body.locker-hub #close-book,body.locker-hub #desk-dialog #dialog-close,body.locker-hub :is(.motion-skip,.motion-controls button){font-size:var(--t-control)!important}
body.locker-hub #book-breadcrumb{white-space:nowrap;flex:none;max-width:none!important;font-size:var(--t-meta)!important;font-family:Hand,Schoolhand,sans-serif!important}
body.locker-hub .ink-key{font-size:.85em!important}
/* cheat sheet: a two-column grid; the key column is as wide as its widest key and starts on the notes' margin, each key centred in it */
body.locker-hub #paper-content .cheat-card{display:grid!important;grid-template-columns:max-content 1fr!important;column-gap:.8em!important;row-gap:.62em!important;align-items:center!important}
/* Keycaps never touch the row above or below: every key and button the same height, a clear gap between rows. */
body.locker-hub #paper-content .cheat-card .device-glyph{height:1.3em!important;min-width:0!important;align-self:center}
body.locker-hub #paper-content .cheat-card .device-glyph :is(svg,img){height:100%!important;width:auto!important;margin:0!important}
body.locker-hub #paper-content .cheat-card .ink-key{height:100%!important;min-width:1.55em!important;padding:0 .62em .12em!important}
body.locker-hub #paper-content .cheat-card .ink-key.ink-key-wide{min-width:2.8em!important}
body.locker-hub #paper-content .cheat-card .ink-key.ink-key-space{min-width:4.4em!important}
body.locker-hub #paper-content .cheat-card .glyph-cheat{display:contents!important}
body.locker-hub #paper-content .cheat-card .glyph-cheat .device-glyph{justify-self:center!important;margin:0!important}
body.locker-hub #paper-content .cheat-card>p:not(.glyph-cheat){grid-column:1/-1!important;margin:.45em 0 0!important;line-height:1.35!important}
/* score lists: rank, name, score on one ruled line, numbers in Patrick Hand */
body.locker-hub .score-list{display:grid!important;grid-template-columns:max-content 1fr max-content!important;column-gap:.8em!important;padding:0!important;margin:0!important;list-style:none!important;max-width:34em}
body.locker-hub .score-list li{display:contents!important}
body.locker-hub .score-list :is(i,span,b){font-family:Hand,Schoolhand,sans-serif!important;font-style:normal!important;font-weight:400!important;font-size:var(--t-body)!important;color:var(--ink)!important;line-height:1.5!important}
body.locker-hub .score-list i{text-align:right;opacity:.75}
body.locker-hub .score-list b{text-align:right}
/* notebooks without a game: picture above, copy below */
body.locker-hub #paper-content.page-play{display:flex!important;flex-direction:column!important;align-items:flex-start!important}
body.locker-hub #paper-content .blank-art{width:70%!important;max-width:none!important;margin:0 0 .8em!important;float:none!important}
/* dialogs */
body.locker-hub #desk-dialog:not(.backpack-dialog){font-size:var(--t-body)!important}
body.locker-hub #desk-dialog #dialog-title{font-size:var(--t-title)!important}
body.locker-hub #desk-dialog #dialog-content :is(p,li,span,strong){font-size:var(--t-body)!important;font-family:Hand,Schoolhand,sans-serif!important}
body.locker-hub #desk-dialog #dialog-content button:not(#dialog-close),body.locker-hub #desk-dialog select{font-size:var(--t-control)!important}
body.locker-hub #desk-dialog .options{grid-template-columns:1fr 1fr!important;gap:.35em 1.4em!important;font-size:inherit!important}
body.locker-hub #desk-dialog .options .volume-row{grid-column:1/-1;display:flex;align-items:center;gap:.7em;padding:.25em .2em;font-size:var(--t-control)}
body.locker-hub #desk-dialog .volume-row input{flex:0 1 14em;min-width:6em;accent-color:#2c4a8a;height:1.2em;cursor:pointer}
body.locker-hub #desk-dialog .volume-row input:is(:focus-visible,.pad-focus){outline:2px solid #2c4a8a;outline-offset:4px;border-radius:6px;filter:drop-shadow(0 0 6px #ffe7a8)}
body.locker-hub #desk-dialog .volume-row .volume-value{min-width:3em;font-variant-numeric:tabular-nums}
body.locker-hub #desk-dialog .options button:not(#dialog-close)[aria-pressed],body.locker-hub #desk-dialog .options button:not(#dialog-close){white-space:nowrap}
body.locker-hub #desk-dialog #dialog-content p.meta{font-size:var(--t-meta)!important;opacity:.8;margin-top:1em}
/* Hand-lettered headings (titles drawn, never a font); the words stay in the page for screen readers. */
body.locker-hub #desk-dialog #dialog-title .heading-settings,body.locker-hub #desk-dialog #dialog-title .heading-calculator,body.locker-hub #desk-dialog #dialog-title .heading-achievements,body.locker-hub #desk-dialog #dialog-title .heading-scores,body.locker-hub #desk-dialog #dialog-title .heading-eraser,body.locker-hub #desk-dialog #dialog-title .heading-confirm,body.locker-hub #desk-dialog #dialog-title .heading-swap,body.locker-hub #desk-dialog #dialog-title .heading-pause,body.locker-hub #desk-dialog #dialog-title .heading-report,body.locker-hub #desk-dialog #dialog-title .heading-daily,body.locker-hub #desk-dialog #dialog-title .heading-news{display:inline-block;height:var(--t-head);color:transparent!important;font-size:0;overflow:hidden;background-position:left center;background-size:contain;background-repeat:no-repeat;aspect-ratio:2.733;background-image:url(@@asset:assets/ui/headings/daily.webp@@)}
html[lang=fr] body.locker-hub #desk-dialog #dialog-title span.heading-daily.heading-daily.heading-daily{aspect-ratio:2.237!important;background-image:url(@@asset:assets/ui/headings/fr/daily.webp@@)!important;color:transparent!important;font-size:0!important;height:calc(var(--t-head) * 1.80)!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:left center!important;display:inline-block!important}
html[lang=es] body.locker-hub #desk-dialog #dialog-title span.heading-daily.heading-daily.heading-daily{aspect-ratio:2.438!important;background-image:url(@@asset:assets/ui/headings/es/daily.webp@@)!important;color:transparent!important;font-size:0!important;height:calc(var(--t-head) * 1.72)!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:left center!important;display:inline-block!important}
html[lang=de] body.locker-hub #desk-dialog #dialog-title span.heading-daily.heading-daily.heading-daily{aspect-ratio:1.979!important;background-image:url(@@asset:assets/ui/headings/de/daily.webp@@)!important;color:transparent!important;font-size:0!important;height:calc(var(--t-head) * 1.13)!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:left center!important;display:inline-block!important}
html[lang=it] body.locker-hub #desk-dialog #dialog-title span.heading-daily.heading-daily.heading-daily{aspect-ratio:1.847!important;background-image:url(@@asset:assets/ui/headings/it/daily.webp@@)!important;color:transparent!important;font-size:0!important;height:calc(var(--t-head) * 1.80)!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:left center!important;display:inline-block!important}
body.locker-hub #desk-dialog #dialog-title .heading-settings,body.locker-hub #desk-dialog #dialog-title .heading-calculator,body.locker-hub #desk-dialog #dialog-title .heading-achievements,body.locker-hub #desk-dialog #dialog-title .heading-scores,body.locker-hub #desk-dialog #dialog-title .heading-eraser,body.locker-hub #desk-dialog #dialog-title .heading-confirm,body.locker-hub #desk-dialog #dialog-title .heading-swap,body.locker-hub #desk-dialog #dialog-title .heading-pause,body.locker-hub #desk-dialog #dialog-title .heading-report,body.locker-hub #desk-dialog #dialog-title .heading-news{display:inline-block;height:var(--t-head);color:transparent!important;font-size:0;overflow:hidden;background-position:left center;background-size:contain;background-repeat:no-repeat;aspect-ratio:2.613;background-image:url(@@asset:assets/ui/headings/news.webp@@)}
body.locker-hub #desk-dialog #dialog-title .heading-padsetup{display:inline-block;height:var(--t-head);color:transparent!important;font-size:0;overflow:hidden;background-position:left center;background-size:contain;background-repeat:no-repeat;aspect-ratio:2.942;background-image:url(@@asset:assets/ui/headings/padsetup.webp@@)}
html[lang=fr] body.locker-hub #desk-dialog #dialog-title span.heading-news.heading-news.heading-news{aspect-ratio:2.533!important;background-image:url(@@asset:assets/ui/headings/fr/news.webp@@)!important;color:transparent!important;font-size:0!important;height:calc(var(--t-head) * 1.36)!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:left center!important;display:inline-block!important}
html[lang=es] body.locker-hub #desk-dialog #dialog-title span.heading-news.heading-news.heading-news{aspect-ratio:2.573!important;background-image:url(@@asset:assets/ui/headings/es/news.webp@@)!important;color:transparent!important;font-size:0!important;height:calc(var(--t-head) * 1.34)!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:left center!important;display:inline-block!important}
html[lang=de] body.locker-hub #desk-dialog #dialog-title span.heading-news.heading-news.heading-news{aspect-ratio:2.573!important;background-image:url(@@asset:assets/ui/headings/de/news.webp@@)!important;color:transparent!important;font-size:0!important;height:calc(var(--t-head) * 1.25)!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:left center!important;display:inline-block!important}
html[lang=it] body.locker-hub #desk-dialog #dialog-title span.heading-news.heading-news.heading-news{aspect-ratio:2.407!important;background-image:url(@@asset:assets/ui/headings/it/news.webp@@)!important;color:transparent!important;font-size:0!important;height:calc(var(--t-head) * 1.10)!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:left center!important;display:inline-block!important}
body.locker-hub #desk-dialog #dialog-title .heading-shoe{display:inline-block;height:var(--t-head);color:transparent!important;font-size:0;overflow:hidden;background-position:left center;background-size:contain;background-repeat:no-repeat;aspect-ratio:2.496;background-image:url(@@asset:assets/ui/headings/gym.webp@@)}
html[lang=fr] body.locker-hub #desk-dialog #dialog-title span.heading-shoe.heading-shoe.heading-shoe{aspect-ratio:1.688!important;background-image:url(@@asset:assets/ui/headings/fr/gym.webp@@)!important;color:transparent!important;font-size:0!important;height:calc(var(--t-head) * 1.20)!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:left center!important;display:inline-block!important}
html[lang=es] body.locker-hub #desk-dialog #dialog-title span.heading-shoe.heading-shoe.heading-shoe{aspect-ratio:1.921!important;background-image:url(@@asset:assets/ui/headings/es/gym.webp@@)!important;color:transparent!important;font-size:0!important;height:calc(var(--t-head) * 1.72)!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:left center!important;display:inline-block!important}
html[lang=de] body.locker-hub #desk-dialog #dialog-title span.heading-shoe.heading-shoe.heading-shoe{aspect-ratio:2.383!important;background-image:url(@@asset:assets/ui/headings/de/gym.webp@@)!important;color:transparent!important;font-size:0!important;height:calc(var(--t-head) * 2.03)!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:left center!important;display:inline-block!important}
html[lang=it] body.locker-hub #desk-dialog #dialog-title span.heading-shoe.heading-shoe.heading-shoe{aspect-ratio:1.753!important;background-image:url(@@asset:assets/ui/headings/it/gym.webp@@)!important;color:transparent!important;font-size:0!important;height:calc(var(--t-head) * 2.20)!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:left center!important;display:inline-block!important}
body.locker-hub #desk-dialog img.daily-title{display:block;height:calc(120 * var(--u));width:auto;margin:.2em 0 .4em}
body.locker-hub #desk-dialog #dialog-content p.daily-name{font-family:'Permanent Marker',Hand,sans-serif!important;font-size:var(--t-title)!important;color:#1b3591;margin:.1em 0 .3em}
body.locker-hub #desk-dialog ol.daily-board{max-width:30em}
/* Daily challenge page: the game in the middle, a line about it, its board in a column under it. */
body.locker-hub #desk-dialog[data-screen=daily] .daily-hero{display:flex;flex-direction:column;align-items:center;text-align:center;margin:.2em 0 .6em}
body.locker-hub #desk-dialog[data-screen=daily] .daily-hero .daily-kicker{margin:0 0 .25em!important;color:#b03a2e!important}
body.locker-hub #desk-dialog[data-screen=daily] .daily-hero .daily-title{height:calc(150 * var(--u))!important;margin:.1em auto .35em!important;transform:rotate(-1.2deg)}
body.locker-hub #desk-dialog[data-screen=daily] .daily-hero .daily-note{margin:0!important;font-style:normal;opacity:.85}
body.locker-hub #desk-dialog[data-screen=daily] .daily-boardbox{width:min(100%,24em);margin:0 auto}
body.locker-hub #desk-dialog[data-screen=daily] .daily-boardbox .score-list{max-width:none!important;margin:0 auto!important}
body.locker-hub #desk-dialog[data-screen=daily] .daily-boardbox p{text-align:center}
body.locker-hub #desk-dialog dl.gym{display:grid;grid-template-columns:auto 1fr;gap:.35em 1.4em;margin:.3em 0;font-size:var(--t-body)}
body.locker-hub #desk-dialog dl.gym dt{opacity:.75}
body.locker-hub #desk-dialog dl.gym dd{margin:0;color:#1b3591}
body.locker-hub #desk-dialog #dialog-title .heading-globe{display:inline-block;height:var(--t-head);color:transparent!important;font-size:0;overflow:hidden;background-position:left center;background-size:contain;background-repeat:no-repeat;aspect-ratio:2.404;background-image:url(@@asset:assets/ui/headings/language.webp@@)}
html[lang=fr] body.locker-hub #desk-dialog #dialog-title .heading-globe{aspect-ratio:1.967;background-image:url(@@asset:assets/ui/headings/fr/language.webp@@);height:calc(var(--t-head) * 1.22)!important}
html[lang=es] body.locker-hub #desk-dialog #dialog-title .heading-globe{aspect-ratio:2.04;background-image:url(@@asset:assets/ui/headings/es/language.webp@@);height:calc(var(--t-head) * 1.20)!important}
html[lang=de] body.locker-hub #desk-dialog #dialog-title .heading-globe{aspect-ratio:2.097;background-image:url(@@asset:assets/ui/headings/de/language.webp@@);height:calc(var(--t-head) * 0.91)!important}
html[lang=it] body.locker-hub #desk-dialog #dialog-title .heading-globe{aspect-ratio:2.046;background-image:url(@@asset:assets/ui/headings/it/language.webp@@);height:calc(var(--t-head) * 1.00)!important}
/* In another language the English lettered headings give way to the translated words (in the title size) until that
   language's lettering is painted; the language heading already has all four. */
html:not([lang=en]) body.locker-hub #desk-dialog #dialog-title span[class^=heading-]:not(.heading-globe){background-image:none!important;color:#1b3591!important;font-size:var(--t-title)!important;aspect-ratio:auto!important;height:auto!important;overflow:visible!important;font-family:'Permanent Marker',Hand,sans-serif!important}
body.locker-hub .lb-whole{background:none!important;border:0!important;box-shadow:none!important;color:#1b3591;text-decoration:underline;text-underline-offset:.2em;cursor:pointer;font-size:var(--t-meta)!important;padding:.2em 0;margin-top:.3em}
/* The language map: a pull-down classroom map with a pin per language in its colour, and the same four as a
   list beside it; the chosen one is ringed. */
body.locker-hub #desk-dialog .lang-wrap{display:flex;gap:calc(30 * var(--u));align-items:center}
body.locker-hub #desk-dialog .lang-map{position:relative;flex:1;min-width:0}
body.locker-hub #desk-dialog .lang-map>img{display:block;width:100%;height:auto;filter:drop-shadow(0 4px 6px rgba(40,30,20,.3))}
body.locker-hub #desk-dialog #dialog-content button.lang-pin{position:absolute!important;background-image:none!important;width:calc(30 * var(--u));min-width:18px;aspect-ratio:1;border-radius:50% 50% 50% 0;transform:translate(-50%,-100%) rotate(-45deg);border:2px solid rgba(20,20,30,.6)!important;box-shadow:0 2px 3px rgba(0,0,0,.35)!important;cursor:pointer;padding:0!important;min-height:0!important;z-index:2}
body.locker-hub #desk-dialog #dialog-content button.lang-pin[aria-pressed=true]{outline:3px solid #fff;outline-offset:2px}
body.locker-hub #desk-dialog ol.lang-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.4em;flex:0 0 auto}
body.locker-hub #desk-dialog ol.lang-list button{display:flex;align-items:center;gap:.6em;background:none!important;border:0!important;box-shadow:none!important;padding:.2em .5em;border-radius:10px;cursor:pointer;font-size:var(--t-body)!important;color:#22355a}
body.locker-hub #desk-dialog ol.lang-list button i{display:inline-block;width:.9em;height:.9em;border-radius:50%;border:2px solid rgba(20,20,30,.5)}
body.locker-hub #desk-dialog ol.lang-list button[aria-pressed=true]{outline:2px solid rgba(27,53,145,.55);background:rgba(27,53,145,.07)!important}
body.locker-hub #desk-dialog ol.lang-list button:is(:hover,:focus-visible,.pad-focus){background:rgba(255,231,168,.5)!important}
@media (max-width:700px){body.locker-hub #desk-dialog .lang-wrap{flex-direction:column}}
body.locker-hub #desk-dialog #dialog-title .heading-walkman{display:inline-block;height:var(--t-head);color:transparent!important;font-size:0;overflow:hidden;background-position:left center;background-size:contain;background-repeat:no-repeat}
body.locker-hub #desk-dialog #dialog-title .heading-settings{aspect-ratio:7.237;background-image:url(@@asset:assets/ui/headings/settings.webp@@)}
body.locker-hub #desk-dialog #dialog-title .heading-report{aspect-ratio:2.785;background-image:url(@@asset:assets/ui/headings/report.webp@@)}
body.locker-hub #desk-dialog #dialog-title .heading-walkman{aspect-ratio:2.835;background-image:url(@@asset:assets/ui/headings/mixtapes.webp@@)}
#now-playing{position:fixed;left:calc(28 * var(--u));bottom:calc(max(64px,calc(110 * var(--u))) + 6px);z-index:40;display:flex;align-items:center;gap:calc(14 * var(--u));padding:calc(12 * var(--u)) calc(22 * var(--u)) calc(12 * var(--u)) calc(14 * var(--u));background:#fbf6ea;border-radius:4px;box-shadow:0 6px 18px rgba(30,20,10,.28);transform:translateX(calc(-100% - 60px)) rotate(-2deg);transition:transform .55s cubic-bezier(.2,.9,.3,1.15);pointer-events:none;font-family:Hand,Schoolhand,sans-serif;color:#1b3591}
#now-playing.show{transform:translateX(0) rotate(-2deg);pointer-events:auto;cursor:pointer}
/* With a notebook open its tabs run along the bottom left, so the slip comes in from the right instead. */
/* The Walkman page already says what is playing, so the slip stays away while a sheet is open. */
body:has(#desk-dialog[open]) #now-playing{opacity:0;visibility:hidden}
/* Small screens: the Walkman page stacks (narrow) or shrinks (short) so the keys and all five tapes stay on the sheet. */


/* With a notebook open it still slides in at the lower left, just above the tabs (host.js sets --np-bottom), clear of the trophy slip at the top right; never on the play page. */
body:has(#book-view:not(.hidden)) #now-playing{bottom:var(--np-bottom,calc(190 * var(--u)))}
body[data-view=play] #now-playing{visibility:hidden}
#now-playing::before{content:'';position:absolute;top:calc(-10 * var(--u));left:38%;width:calc(90 * var(--u));height:calc(22 * var(--u));background:rgba(236,226,196,.75);transform:rotate(3deg);box-shadow:0 1px 2px rgba(0,0,0,.08)}
#now-playing img{width:calc(150 * var(--u));min-width:90px;height:auto;filter:drop-shadow(0 2px 2px rgba(40,30,20,.3));animation:np-wobble 2.4s ease-in-out infinite}
#now-playing .np-words{display:flex;flex-direction:column;line-height:1.15}
#now-playing .np-kicker,#now-playing .np-tape{font-size:var(--t-meta);opacity:.75}
#now-playing .np-song{font-size:var(--t-body);color:#22355a}
@keyframes np-wobble{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1.5deg)}}
@media (prefers-reduced-motion:reduce){#now-playing{transition:opacity .3s;transform:rotate(-2deg);opacity:0}#now-playing.show{opacity:1;transform:rotate(-2deg)}#now-playing img{animation:none}}
/* Mixtapes page (second layout): left, the song playing in large type with the whole tape's song list and the
   Walkman under it; right, the five tapes down the page, large, each with its maker's photo, title and note. */
body.locker-hub #desk-dialog #dialog-content .walkman-deck{display:flex;flex-direction:row;align-items:flex-start;gap:calc(34 * var(--u));margin:0;padding:0}
body.locker-hub #desk-dialog #dialog-content .walkman-deck .walkman-player{flex:0 0 calc(270 * var(--u));display:flex;flex-direction:column;align-items:stretch;gap:.8em}
body.locker-hub #desk-dialog #dialog-content .tape-now-block p{margin:0}
body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-case ol.tape-songs li.tape-link{font-size:var(--t-meta)!important;margin:0 0 .3em!important;line-height:1.1;opacity:.9}
body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-case.case-links ol.tape-songs{left:13%;right:13%}
body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-mode{margin-top:.25em;text-align:center;opacity:.8}
body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-kicker{color:#c0392b;opacity:1}
body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-song{font-size:var(--t-body)!important;color:#1b3591;line-height:1.1;margin:.1em 0}
body.locker-hub #desk-dialog #dialog-content .tape-now-block ol.tape-songs{margin:.5em 0 0 1.5em;padding:0}
body.locker-hub #desk-dialog #dialog-content .tape-now-block ol.tape-songs li{font-size:var(--t-control)!important;margin:.1em 0;opacity:.6}
body.locker-hub #desk-dialog #dialog-content .tape-now-block ol.tape-songs li.playing{opacity:1}




body.locker-hub #desk-dialog #dialog-content ol.tape-list{list-style:none;margin:0;padding:0;flex:1;min-width:0;display:flex;flex-direction:column;gap:.2em}
body.locker-hub #desk-dialog #dialog-content ol.tape-list button.tape{display:flex;align-items:center;gap:calc(22 * var(--u));font-size:var(--t-meta)!important;width:100%;text-align:left;background:none!important;border:0!important;box-shadow:none!important;padding:.15em .5em;border-radius:12px;cursor:pointer}
body.locker-hub #desk-dialog #dialog-content ol.tape-list .tape-art{position:relative;flex:0 0 max(150px,calc(262 * var(--u)));padding-left:max(62px,calc(108 * var(--u)));box-sizing:border-box}
body.locker-hub #desk-dialog #dialog-content ol.tape-list img.tape-cassette{position:relative;z-index:1;display:block;width:100%;height:auto;filter:drop-shadow(0 2px 3px rgba(40,30,20,.3))}
body.locker-hub #desk-dialog #dialog-content ol.tape-list img.tape-photo{position:absolute;left:0;top:50%;margin-top:calc(-.5 * max(56px,calc(98 * var(--u))));width:max(56px,calc(98 * var(--u)));z-index:2;height:auto;transform:rotate(-7deg);filter:drop-shadow(0 2px 2px rgba(40,30,20,.3))}
body.locker-hub #desk-dialog #dialog-content ol.tape-list .tape-words{display:flex;flex-direction:column;min-width:0;flex:1;line-height:1.15}
body.locker-hub #desk-dialog #dialog-content ol.tape-list button.tape span.tape-words b.tape-title{font-weight:normal;font-size:var(--t-control)!important;color:#22355a}
body.locker-hub #desk-dialog #dialog-content ol.tape-list button.tape span.tape-words span.tape-note{font-size:var(--t-meta)!important;line-height:1.2;opacity:.8}
body.locker-hub #desk-dialog #dialog-content ol.tape-list button.tape[aria-pressed=true]{background:rgba(27,53,145,.07)!important;outline:2px solid rgba(27,53,145,.55);outline-offset:-1px}
body.locker-hub #desk-dialog #dialog-content ol.tape-list button.tape:is(:hover,:focus-visible,.pad-focus){background:rgba(255,231,168,.45)!important}
@media (max-width:700px){body.locker-hub #desk-dialog #dialog-content .walkman-deck{flex-direction:column;padding-left:2.6em;gap:1em}body.locker-hub #desk-dialog #dialog-content .walkman-deck .walkman-player{flex:none;width:100%}body.locker-hub #desk-dialog #dialog-content ol.tape-list{width:100%}body.locker-hub #desk-dialog #dialog-content ol.tape-list .tape-art{flex-basis:5.4em;padding-left:1.6em}body.locker-hub #desk-dialog #dialog-content ol.tape-list img.tape-photo{width:2em}}
@media (max-height:560px){body.locker-hub #desk-dialog #dialog-content ol.tape-list .tape-note{display:none}body.locker-hub #desk-dialog #dialog-content ol.tape-list{gap:0}body.locker-hub #desk-dialog #dialog-content ol.tape-list button.tape{padding:0 .4em}body.locker-hub #desk-dialog #dialog-content ol.tape-list .tape-art{flex-basis:4.6em;padding-left:1.4em}body.locker-hub #desk-dialog #dialog-content ol.tape-list img.tape-photo{width:1.6em}body.locker-hub #desk-dialog #dialog-content .walkman-deck .walkman-player{flex-basis:10em}body.locker-hub #desk-dialog #dialog-content .tape-now-block ol.tape-songs{display:none}}
/* Touch play: while a game is on the page nothing scrolls, bounces or zooms, so a finger that slides
   off the play area never pulls the browser bar in or out (which resized and seemed to zoom the page). */
html:has(body[data-view=play]),body[data-view=play]{overflow:hidden;overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
body[data-view=play] #book-view,body[data-view=play] #game-mount{touch-action:none}
/* Action ruler: a wooden school ruler along the bottom of every screen with the actions available now. */
#action-ruler{position:fixed;left:50%;bottom:calc(max(6px,calc(10 * var(--u))) * var(--rh,1));transform:translateX(-50%);z-index:60;display:none;align-items:center;justify-content:center;overflow:hidden;gap:calc(26 * var(--u) * var(--rk,1));max-width:96vw;box-sizing:border-box;height:calc(max(48px,calc(72 * var(--u))) * var(--rh,1));padding:calc(20 * var(--u) * var(--rh,1)) calc(48 * var(--u)) 0;border-style:solid;border-width:0 calc(40 * var(--u));border-image:url(${RULER}) 0 60 fill / 0 calc(40 * var(--u)) stretch;filter:drop-shadow(0 4px 6px rgba(30,20,10,.35));font-family:Hand,Schoolhand,sans-serif;color:#22355a;white-space:nowrap}
body.has-ruler #action-ruler{display:flex}
/* the chosen thing's name on a slip beside it: the glow alone was easy to miss */#lift-tag{position:fixed;z-index:55;pointer-events:none;display:none;font-family:Hand,Schoolhand,sans-serif;font-size:var(--t-control);line-height:1.15;color:#1b3591;background:#fbf6e9;border:max(1.5px,calc(2.2 * var(--u))) solid #1b3591;border-radius:3px 6px 4px 5px;padding:.2em .55em .32em;white-space:nowrap;box-shadow:0 calc(3 * var(--u)) calc(10 * var(--u)) rgba(20,14,28,.35);transform:translate(-50%,0) rotate(-1.4deg)}#lift-tag.on{display:block}body:has(#desk-dialog[open]) #lift-tag,body.touch-play #lift-tag{display:none!important}#lift-tag::after{content:'';position:absolute;left:50%;width:.4em;height:.4em;background:#fbf6e9;border:inherit;border-width:0 max(1.5px,calc(2.2 * var(--u))) max(1.5px,calc(2.2 * var(--u))) 0;transform:translateX(-50%) rotate(45deg)}#lift-tag.below{padding:.32em .55em .2em}#lift-tag:not(.below)::after{bottom:calc(-.2em - max(1.5px,calc(2.2 * var(--u))))}#lift-tag.below::after{top:calc(-.2em - max(1.5px,calc(2.2 * var(--u))));transform:translateX(-50%) rotate(225deg)}
#action-ruler{pointer-events:none}#action-ruler .ruler-slot{pointer-events:auto;display:inline-flex;align-items:center;gap:.3em;font-size:calc(var(--t-control) * var(--rk,1))!important;background:none;border:0;padding:.1em .35em;border-radius:8px;color:inherit;font-family:inherit;cursor:pointer;line-height:1}
#action-ruler .ruler-slot.info{cursor:default;pointer-events:none}/* every key on the ruler is the same full white correction fluid (arrows white, Esc and letters beige; the multiply blend let the wood through, the info slot's opacity hid it) */#action-ruler .device-glyph{mix-blend-mode:normal!important}
/* still too long on a phone (rows of ruler covered the page): one row that scrolls sideways */#action-ruler.two-rows{flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto;overflow-y:hidden;width:94vw;max-width:94vw;scrollbar-width:none;-webkit-overflow-scrolling:touch}#action-ruler.two-rows::-webkit-scrollbar{display:none}#action-ruler.two-rows .ruler-slot{flex:0 0 auto}#action-ruler .ruler-slot.word-only{padding:.15em .55em}
/* short screens (phones lying down): smaller lettered headings, so the page keeps room for its content */@media (max-height:520px){:root{--t-head:38px!important}body.locker-hub #desk-dialog #dialog-title{margin-top:0!important;margin-bottom:.1em!important}}
/* A sheet keeps the ruler's band free at its foot, so nothing on it sits under the ruler. */
body.has-ruler #desk-dialog[open] #dialog-content{padding-bottom:max(64px,calc(96 * var(--u)))!important}
#action-ruler button.ruler-slot:is(:hover,:focus-visible){background:rgba(255,231,168,.6)}
#action-ruler .ruler-slot+.ruler-slot{border-left:1.5px solid rgba(60,40,20,.35);padding-left:calc(26 * var(--u));border-radius:0}
/* The ruler holds back and the hints, so the old corner slips and the hint line go. */
body.has-ruler #input-prompts,body.has-ruler #desk-dialog #dialog-close,body.has-ruler #close-book{display:none!important}
@media (max-width:700px){#action-ruler{gap:.5em;padding-left:1em;padding-right:1em}#action-ruler .ruler-slot.info{display:none}#action-ruler .ruler-slot+.ruler-slot{padding-left:.6em}}
/* Mixtapes: five painted tapes, three over two; the one in the Walkman sits a little higher with a pen ring. */
body.locker-hub #desk-dialog .walkman-deck{display:flex;gap:2.2em;align-items:flex-start;margin:.2em 0 .6em}
body.locker-hub #desk-dialog .walkman-player{flex:0 0 9.5em;display:flex;flex-direction:column;align-items:center;gap:.5em}
body.locker-hub #desk-dialog img.walkman-body{width:100%;height:auto;filter:drop-shadow(0 4px 4px rgba(40,30,20,.3));transform:rotate(-2deg)}

body.locker-hub #desk-dialog .walkman-keys{display:flex;gap:.45em}
body.locker-hub #desk-dialog button.walkman-key{background:none!important;border:0!important;box-shadow:none!important;padding:0;width:3.1em;cursor:pointer;transition:transform .08s}
body.locker-hub #desk-dialog button.walkman-key img{width:100%;height:auto;display:block;filter:drop-shadow(0 3px 2px rgba(40,30,20,.35))}
body.locker-hub #desk-dialog button.walkman-key:active,body.locker-hub #desk-dialog button.walkman-key[aria-pressed=true]{transform:translateY(3px)}
body.locker-hub #desk-dialog button.walkman-key[aria-pressed=true] img{filter:brightness(.92) drop-shadow(0 1px 1px rgba(40,30,20,.35))}
body.locker-hub #desk-dialog button.walkman-key:disabled{opacity:.45;cursor:default}
body.locker-hub #desk-dialog button.walkman-key:is(:hover,:focus-visible,.pad-focus) img{filter:drop-shadow(0 0 7px #ffe7a8) drop-shadow(0 3px 2px rgba(40,30,20,.35))}



body.locker-hub #desk-dialog ol.tape-songs{margin:0 0 .6em 1.4em;padding:0}
body.locker-hub #desk-dialog ol.tape-songs li{margin:.15em 0;opacity:.7}
body.locker-hub #desk-dialog ol.tape-songs li.tape-pick{cursor:pointer}
#desk-dialog ol.tape-songs li.tape-pick:hover,#desk-dialog ol.tape-songs li.tape-pick:focus-visible{opacity:1;outline:none;text-decoration:underline;text-decoration-color:rgba(27,53,145,.45);text-decoration-thickness:2px;text-underline-offset:.2em}
#desk-dialog ol.tape-songs li.playing{opacity:1;text-decoration:underline;text-decoration-color:#1b3591;text-decoration-thickness:2px;text-underline-offset:.2em;position:relative}
body.locker-hub #desk-dialog ol.tape-songs li.playing::before{content:'';position:absolute;left:-2.6em;top:.3em;width:0;height:0;border-left:.62em solid #c0392b;border-top:.38em solid transparent;border-bottom:.38em solid transparent}
body.locker-hub #desk-dialog ol.tape-songs li.playing.paused::before{border:0;width:.18em;height:.72em;background:#c0392b;box-shadow:.32em 0 0 #c0392b}
body.locker-hub #desk-dialog .tapes{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.4em 1em;margin:.4em 0 .4em;max-width:56em}
body.locker-hub #desk-dialog .tapes button.tape{background:none!important;border:0!important;box-shadow:none!important;padding:.3em;display:flex;flex-direction:column;align-items:center;gap:.15em;cursor:pointer;transition:transform .15s}
body.locker-hub #desk-dialog .tapes .tape-art{position:relative;display:block;width:100%;padding-left:27%;box-sizing:border-box}
body.locker-hub #desk-dialog .tapes img.tape-cassette{position:relative;z-index:1;display:block;width:100%;height:auto;filter:drop-shadow(0 3px 3px rgba(40,30,20,.25))}
body.locker-hub #desk-dialog .tapes img.tape-photo{position:absolute;z-index:0;left:0;top:-12%;width:32%;height:auto;transform:rotate(-8deg);filter:drop-shadow(0 2px 3px rgba(40,30,20,.3))}
body.locker-hub #desk-dialog .tapes button.tape:nth-child(2n) img.tape-photo{transform:rotate(-4deg);top:-10%}
body.locker-hub #desk-dialog .tapes button.tape:nth-child(3) img.tape-photo{transform:rotate(-11deg)}
body.locker-hub #desk-dialog .tapes button.tape span{font-size:var(--t-meta)!important;opacity:.85;white-space:nowrap;max-width:100%}
body.locker-hub #desk-dialog .tapes button.tape{min-width:0}
body.locker-hub #desk-dialog .tapes button.tape[aria-pressed=true]{transform:translateY(-.35em) rotate(-1.5deg)}
body.locker-hub #desk-dialog .tapes button.tape[aria-pressed=true] img.tape-cassette{outline:2.5px solid #1b3591;outline-offset:5px;border-radius:14px}
body.locker-hub #desk-dialog .tapes button.tape:is(:hover,:focus-visible,.pad-focus) img.tape-cassette{filter:drop-shadow(0 0 7px #ffe7a8) drop-shadow(0 3px 3px rgba(40,30,20,.25))}
/* The old desk's volume ruler has no place in the locker (volume lives in settings); hidden, it no longer sits invisibly
   over the backpack and the shoe catching their clicks. Its input stays in the page for the settings slider. */
body.locker-hub #ruler-control{display:none!important}

/* One look for every section title on every sheet: her red ballpoint at body size over a thin red rule,
   the settings groups' style, for the tiny victories groups, the boards' labels and the like. */
body.locker-hub #desk-dialog #dialog-content :is(h3.settings-group,p.settings-group,h2.trophy-group,p.lb-label){font-family:Hand,Schoolhand,sans-serif!important;font-weight:normal!important;font-size:var(--t-body)!important;color:#b03a2e!important;border:0!important;border-bottom:1.5px solid rgba(176,58,46,.35)!important;padding:0 0 .05em!important;letter-spacing:0!important;text-transform:none!important}
/* The detention slip's "which notebook" choice is a dropdown like every other one (it looked like a boxed title). */
body.locker-hub #desk-dialog[data-screen=report] #dialog-content select{display:block;margin:0 0 .5em;max-width:100%}
body.locker-hub #desk-dialog .visually-hidden{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important;margin:0!important;padding:0!important}
/* Detention slip form: the select and the note on the ruled sheet, in her hand. */
body.locker-hub #desk-dialog[data-screen=report] #dialog-content textarea{display:block;width:100%;box-sizing:border-box;margin:0 0 .5em;font-family:Hand,Schoolhand,sans-serif;font-size:var(--t-body);color:var(--ink);background:#fffdf6cc;border:1px solid #1f3a6b55;border-radius:3px;padding:.2em .4em}
body.locker-hub #desk-dialog[data-screen=report] #dialog-content textarea{resize:none;line-height:1.35}
body.locker-hub #desk-dialog .slip-keys{display:flex;flex-direction:column;align-items:center;gap:.15em;margin:.2em 0 .4em}body.locker-hub #desk-dialog .slip-row{display:flex;gap:.2em}
body.locker-hub #desk-dialog #dialog-content button.slip-key{min-width:1.9em;padding:.05em .3em!important;text-align:center;font-size:var(--t-meta)!important;background:url(@@asset:assets/ui/key.webp@@) center/100% 100% no-repeat!important;color:#1f2433!important}body.locker-hub #desk-dialog #dialog-content button.slip-key.wide{min-width:7em}
body.locker-hub #desk-dialog #dialog-content button.slip-key:is(:focus-visible,.pad-focus){outline:2px solid #1f3a6b;outline-offset:2px;filter:drop-shadow(0 0 5px #ffe7a8)}
body.locker-hub #desk-dialog[data-screen=report] #dialog-content textarea:focus-visible{outline:2px solid #1f3a6b;outline-offset:2px}
body.locker-hub #desk-dialog #dialog-title .heading-calculator{aspect-ratio:5.537;background-image:url(@@asset:assets/ui/headings/points.webp@@)}
body.locker-hub #desk-dialog #dialog-title .heading-achievements{aspect-ratio:5.925;background-image:url(@@asset:assets/ui/headings/victories.webp@@)}
body.locker-hub #desk-dialog #dialog-title .heading-scores{aspect-ratio:5.982;background-image:url(@@asset:assets/ui/headings/scores.webp@@)}
body.locker-hub #desk-dialog #dialog-title .heading-eraser{aspect-ratio:6.694;background-image:url(@@asset:assets/ui/headings/eraser.webp@@)}
body.locker-hub #desk-dialog #dialog-title .heading-confirm{aspect-ratio:9.151;background-image:url(@@asset:assets/ui/headings/confirm.webp@@)}
body.locker-hub #desk-dialog #dialog-title .heading-swap{aspect-ratio:6.412;background-image:url(@@asset:assets/ui/headings/swap.webp@@)}
body.locker-hub #desk-dialog #dialog-title .heading-pause{aspect-ratio:2.585;background-image:url(@@asset:assets/ui/headings/pause.webp@@)}
/* who's who: each character page is a classic Polaroid with the full name handwritten under the photo (Nano Banana lettering, not a font), no notebook sheet */
body.locker-hub #desk-dialog[data-screen=cast]{background:none!important;filter:none!important;padding:0!important;width:auto!important;overflow:visible!important}
body.locker-hub #desk-dialog[data-screen=cast]::backdrop{background:#120f1cb3}
body.locker-hub #desk-dialog[data-screen=cast] #dialog-title{display:none!important}
body.locker-hub #desk-dialog[data-screen=cast] #dialog-close{position:fixed!important;left:calc(48 * var(--u));top:calc(40 * var(--u));background:url(${TAPE_B}) center/100% 100% no-repeat!important;padding:.4em 1em .5em!important;transform:rotate(-1.2deg);filter:drop-shadow(2px 4px 5px #0006)}
body.locker-hub #desk-dialog .polaroid{--s:min(56vh,calc(600 * var(--u)));margin:0 auto;width:var(--s);box-sizing:content-box;background:linear-gradient(160deg,#fdfcf7,#f1eee4);padding:calc(var(--s) * 6 / 79) calc(var(--s) * 4.5 / 79) 0;transform:rotate(var(--tilt,-1deg));box-shadow:0 2px 3px #0003,4px 14px 26px #0008}
/* classic Polaroid: 88 x 107 mm card, 79 mm square photo, 6 mm top, 4.5 mm sides, 22 mm bottom where the name is written */
body.locker-hub #desk-dialog .cast-page{display:block;width:var(--s);height:var(--s);object-fit:cover;object-position:50% 10%;outline:1px solid #2a20180f;cursor:pointer;filter:saturate(.92) contrast(1.02)}
body.locker-hub #desk-dialog .polaroid-stack{--s:min(56vh,calc(600 * var(--u)));position:relative;width:max-content;margin:0 auto}
body.locker-hub #desk-dialog .polaroid-unders{position:absolute;inset:0;pointer-events:none}
body.locker-hub #desk-dialog .polaroid-under{position:absolute;inset:0;background:linear-gradient(160deg,#f8f6ee,#e9e4d6);box-shadow:0 2px 3px #0003,3px 10px 18px #0006;transform:translate(calc(var(--k) * var(--s) * .018),calc(var(--k) * var(--s) * .012)) rotate(var(--r))}
body.locker-hub #desk-dialog .polaroid-stack>.polaroid{position:relative}
body.locker-hub #desk-dialog .polaroid-name{box-sizing:border-box;height:calc(var(--s) * 22 / 79);display:flex;align-items:center;justify-content:center}
body.locker-hub #desk-dialog .polaroid-written{height:calc(var(--s) * .15);width:auto;max-width:90%;object-fit:contain;transform:rotate(-1.5deg)}
@media (orientation:portrait){body.locker-hub #desk-dialog .polaroid,body.locker-hub #desk-dialog .polaroid-stack{--s:min(56vh,74vw)}}@media (max-height:520px){body.locker-hub #desk-dialog .polaroid,body.locker-hub #desk-dialog .polaroid-stack{--s:min(47vh,calc(600 * var(--u)))}}
body.locker-hub #desk-dialog .polaroid{transform-style:preserve-3d;transition:transform .55s cubic-bezier(.3,.7,.3,1);cursor:pointer}
body.locker-hub #desk-dialog .polaroid.flipped{transform:rotate(var(--tilt,-1deg)) rotateY(180deg)}
body.locker-hub #desk-dialog .polaroid>:not(.polaroid-back){backface-visibility:hidden}
/* WebKit can show the far face through the near one: swap visibility at the half-turn as well */
body.locker-hub #desk-dialog .polaroid>*{-webkit-backface-visibility:hidden;transition:visibility 0s linear .27s}
body.locker-hub #desk-dialog .polaroid:not(.flipped)>.polaroid-back,body.locker-hub #desk-dialog .polaroid.flipped>:not(.polaroid-back){visibility:hidden}
body.locker-hub #desk-dialog .polaroid-back{position:absolute;inset:0;transform:rotateY(180deg);backface-visibility:hidden;background:linear-gradient(200deg,#f6f3ea,#ebe6d8);display:flex;align-items:center;justify-content:center;padding:calc(var(--s) * .1);box-sizing:border-box}
body.locker-hub #desk-dialog .polaroid-back-note{max-width:100%;max-height:100%;object-fit:contain;transform:rotate(1deg)}
body.reduce-motion #desk-dialog .polaroid{transition:none}
body.locker-hub #desk-dialog .polaroid:focus-visible{outline:2px solid #1f3a6b;outline-offset:4px}
body.locker-hub #desk-dialog[data-screen=cast] .cast-nav{width:max-content;margin:calc(28 * var(--u)) auto 0;padding:.35em 1.2em .45em;background:url(${TAPE_B}) center/100% 100% no-repeat;filter:drop-shadow(2px 4px 5px #0006)}
body.locker-hub #desk-dialog .cast-nav{display:flex;align-items:center;justify-content:center;gap:1.4em;margin-top:.6em;font-size:var(--t-control)}
body.locker-hub #desk-dialog .cast-count{font-size:var(--t-meta);font-family:Hand,Schoolhand,sans-serif}
body.locker-hub #desk-dialog .calculator-total{font-family:Hand,Schoolhand,sans-serif!important;font-size:var(--t-title)!important}
/* Esc title is on its own slip, top left */

body.locker-hub #book-chrome{align-items:center!important;height:auto!important}
body.locker-hub #book-chrome :is(#close-book,#book-breadcrumb){background:url(${TAPE_A}) center/100% 100% no-repeat!important;color:#152e43!important;border-radius:0!important;padding:.35em 1em .45em!important;box-shadow:none!important;text-shadow:none!important;filter:drop-shadow(2px 4px 5px #1e18305c)}
/* Buttons are bands of white correction tape she laid down to write on. */
body.locker-hub #book-chrome #book-breadcrumb{background-image:url(@@asset:assets/ui/tape-d.webp@@)!important}
body.locker-hub #close-book{transform:rotate(-1.2deg)}body.locker-hub:has(#desk-dialog[open]) #close-book{visibility:hidden}body.locker-hub #book-breadcrumb{transform:rotate(.8deg)}
body.locker-hub #close-book .device-glyph{mix-blend-mode:normal!important}

/* Lettered page headings read as titles: large, centred, shrunk only when the page is too narrow. */
body.locker-hub #desk-dialog #dialog-title span[class^=heading-]{max-width:100%!important;background-position:center!important}
body.locker-hub #desk-dialog:focus,body.locker-hub #desk-dialog:focus-visible{outline:none}

/* The comic's keys sit on the same ruler as every other screen: previous, next and hold to skip. */
body.locker-hub .motion-controls{position:fixed!important;left:50%!important;right:auto!important;top:auto!important;bottom:max(6px,calc(10 * var(--u)))!important;transform:translateX(-50%);z-index:60;display:flex!important;align-items:center;justify-content:center;gap:0!important;max-width:96vw;box-sizing:border-box;height:max(48px,calc(72 * var(--u)));padding:calc(20 * var(--u)) calc(48 * var(--u)) 0;border-style:solid;border-width:0 calc(40 * var(--u));border-image:url(${RULER}) 0 60 fill / 0 calc(40 * var(--u)) stretch;filter:drop-shadow(0 4px 6px rgba(30,20,10,.35));white-space:nowrap}
body.locker-hub .motion-controls[hidden]{display:none!important}
body.locker-hub .motion-controls :is(button,.motion-skip){position:static!important;background:none!important;box-shadow:none!important;text-shadow:none!important;color:#22355a!important;border:0!important;border-radius:8px!important;padding:.1em .35em!important;line-height:1;display:inline-flex!important;align-items:center;gap:.3em;cursor:pointer}
body.locker-hub .motion-controls :is(button,.motion-skip)[hidden]{display:none!important}
body.locker-hub .motion-controls :is(button,.motion-skip)+:is(button,.motion-skip){border-left:1.5px solid rgba(60,40,20,.35)!important;border-radius:0!important;padding-left:.6em!important;margin-left:.3em}
body.locker-hub .motion-controls :is(button,.motion-skip):is(:hover,:focus-visible){background:rgba(255,231,168,.6)!important}

/* Six tapes (the secret one found): each row a little smaller so the list still fits the sheet. */
body.locker-hub #desk-dialog #dialog-content ol.tape-list:has(>li:nth-child(6)) .tape-art{flex-basis:max(130px,calc(212 * var(--u)));padding-left:max(52px,calc(88 * var(--u)))}
body.locker-hub #desk-dialog #dialog-content ol.tape-list:has(>li:nth-child(6)) img.tape-photo{width:max(48px,calc(80 * var(--u)));margin-top:calc(-.5 * max(48px,calc(80 * var(--u))))}
body.locker-hub #desk-dialog #dialog-content ol.tape-list:has(>li:nth-child(6)) .tape-note{line-height:1.1!important}
body.locker-hub #desk-dialog #dialog-content ol.tape-list:has(>li:nth-child(6)){gap:0}

/* The online score browser's arrows, count and whole-board link live on the ruler. */
body.has-ruler #desk-dialog :is(.cast-nav,.lb-whole){display:none!important}
body.has-ruler #desk-dialog #dialog-content [data-pad=Y]{display:none!important}

/* What's new: one entry per release, newest first. */
body.locker-hub #desk-dialog #dialog-content ol.news{list-style:none;margin:0;padding:0 .8em 0 2.4em;max-width:46em;max-height:57vh;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#24354366 transparent;outline:none}
@media (orientation:portrait){body.locker-hub #desk-dialog #dialog-content ol.news{max-height:min(60vh,calc(100vh - 260px))}}
body.locker-hub #desk-dialog #dialog-content ol.news li{margin:0 0 .55em;line-height:1.3}
body.locker-hub #desk-dialog #dialog-content ol.news b{display:block;color:#b03a2e;font-weight:normal;font-size:var(--t-meta)}

/* Title icons match the lettered titles. */
body.locker-hub #desk-dialog #dialog-title::before{width:calc(var(--t-head) * .95)!important;height:calc(var(--t-head) * .95)!important;margin-right:.15em}
/* Settings groups. */
body.locker-hub #desk-dialog #dialog-content p.settings-group{margin:.6em 0 .1em!important;color:#b03a2e;font-size:var(--t-control)!important;border-bottom:1.5px solid rgba(176,58,46,.35);padding-bottom:.05em}
body.locker-hub #desk-dialog #dialog-content p.settings-group:first-of-type{margin-top:0!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .options{gap:0 1.4em!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .options button{padding-top:.12em!important;padding-bottom:.12em!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .volume-row{padding:.1em .2em!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .actions{margin-top:.5em!important}

/* Set up my controller. */
body.locker-hub #desk-dialog #dialog-content .pad-ask{text-align:center;margin:.6em 0 .2em}
body.locker-hub #desk-dialog #dialog-content .pad-glyph{display:flex;justify-content:center;font-size:calc(var(--t-title) * 1.6)!important;margin:.2em 0}
body.locker-hub #desk-dialog #dialog-content .pad-count{text-align:center}

/* The detention slip sits in front of the sneaker's larger area (the whole sneaker opens the gym report). */
#desk-report{z-index:3!important}

/* Mixtapes: the Walkman with the chosen tape is the title icon; the songs and keys fill the player side. */
body.locker-hub #desk-dialog[data-screen=walkman] #dialog-title::before{display:block!important;background-image:var(--walkman-icon)!important;width:calc(var(--t-head) * .9)!important;height:calc(var(--t-head) * 1.35)!important;transform:rotate(-4deg);filter:drop-shadow(0 3px 3px rgba(40,30,20,.3));margin-top:calc(var(--t-head) * -.25)}

body.locker-hub #desk-dialog #dialog-content .walkman-deck .walkman-player{flex:0 0 calc(250 * var(--u))!important;align-items:stretch!important;gap:1em!important}
body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-song{font-size:calc(var(--t-body) * 1.3)!important}
body.locker-hub #desk-dialog #dialog-content .tape-now-block ol.tape-songs li{font-size:var(--t-body)!important;margin:.25em 0!important}
body.locker-hub #desk-dialog #dialog-content .walkman-player > .walkman-keys{display:flex!important;flex-direction:row!important;justify-content:flex-start;gap:calc(18 * var(--u))!important;margin-left:1.2em}
body.locker-hub #desk-dialog #dialog-content .walkman-player > .walkman-keys button.walkman-key{width:calc(78 * var(--u))!important;display:flex;flex-direction:column;align-items:center;gap:.15em}
body.locker-hub #desk-dialog #dialog-content .walkman-key-word{font-size:var(--t-meta)!important;color:#1b3591;font-family:Hand,Schoolhand,sans-serif;white-space:nowrap}
body.locker-hub #desk-dialog #dialog-content ol.tape-list:has(>li:nth-child(6)) .tape-note{font-size:calc(var(--t-meta) * .92)!important}
body.locker-hub #desk-dialog #dialog-content ol.tape-list:has(>li:nth-child(6)) button.tape{padding-top:.05em!important;padding-bottom:.05em!important}

/* Tape rows: cassette, its note, then its maker's photo on the right. The Walkman keys are on the ruler. */
body.locker-hub #desk-dialog #dialog-content ol.tape-list .tape-art{padding-left:0!important;flex-basis:max(110px,calc(190 * var(--u)))!important}
body.locker-hub #desk-dialog #dialog-content ol.tape-list img.tape-photo{position:static!important;margin:0!important;flex:0 0 auto;width:max(48px,calc(84 * var(--u)))!important;transform:rotate(4deg)!important}
body.locker-hub #desk-dialog #dialog-content .walkman-key-word{display:none!important}

/* A lean left side: one line of what is playing, the song large, the tape's songs numbered below. */
body.locker-hub #desk-dialog #dialog-content .walkman-player > .walkman-keys[hidden]{display:none!important}
body.locker-hub #desk-dialog #dialog-content .walkman-deck .walkman-player{flex-basis:calc(270 * var(--u))!important;padding-top:.4em}
body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-song{font-size:calc(var(--t-title) * .9)!important;font-family:Hand,Schoolhand,sans-serif;line-height:1.05!important;margin:.15em 0 .5em!important}
body.locker-hub #desk-dialog #dialog-content .tape-now-block ol.tape-songs{margin:.2em 0 0 1.6em!important;border-top:1.5px solid rgba(27,53,145,.25);padding-top:.5em!important}
body.locker-hub #desk-dialog #dialog-content .tape-now-block ol.tape-songs li{font-size:var(--t-control)!important;margin:.35em 0!important}
body.locker-hub #desk-dialog #dialog-content ol.tape-list .tape-art{flex-basis:max(96px,calc(160 * var(--u)))!important}
body.locker-hub #desk-dialog #dialog-content ol.tape-list:has(>li:nth-child(6)) .tape-art{flex-basis:max(90px,calc(146 * var(--u)))!important}
body.locker-hub #desk-dialog #dialog-content ol.tape-list img.tape-photo{width:max(44px,calc(74 * var(--u)))!important}
/* tapes fit above the ruler: tight rows, and the list scrolls on short screens */
body.locker-hub #desk-dialog #dialog-content ol.tape-list{gap:0!important;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:rgba(27,53,145,.35) transparent;padding:3px 4px 3px 0}
body.locker-hub #desk-dialog #dialog-content ol.tape-list button.tape{padding-top:.08em!important;padding-bottom:.08em!important}
body.locker-hub #desk-dialog #dialog-content .tape-kicker{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body.locker-hub #desk-dialog #dialog-content{scrollbar-width:thin;scrollbar-color:rgba(27,53,145,.35) transparent;overscroll-behavior:contain}
body.locker-hub #desk-dialog #dialog-title .heading-padsetup{height:calc(var(--t-head) * 1.2)}
body.locker-hub #desk-dialog[data-screen=padsetup] #dialog-content p{text-align:center}
body.locker-hub #desk-dialog #dialog-content img.pad-pic{display:block;margin:0 auto .4em;height:calc(230 * var(--u));width:auto;max-width:90%;object-fit:contain;filter:drop-shadow(0 4px 5px rgba(40,30,20,.3))}
@media (max-height:560px){body.locker-hub #desk-dialog #dialog-content img.pad-pic{height:90px}}
#lyrics-line{position:fixed;left:50%;bottom:calc(max(64px,calc(110 * var(--u))) + 14px);transform:translateX(-50%);z-index:41;max-width:min(90vw,calc(1300 * var(--u)));padding:.18em .7em;font-family:Hand,Schoolhand,sans-serif;font-size:var(--t-body);line-height:1.2;text-align:center;color:#1b3591;background:rgba(253,248,234,.88);border-radius:6px;box-shadow:0 2px 6px rgba(40,30,20,.18);opacity:0;transition:opacity .25s;pointer-events:none}
#lyrics-line.show{opacity:1}
@media (max-width:560px){body.locker-hub #desk-dialog .options{grid-template-columns:1fr!important}body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-case{width:min(100%,220px)!important}}
/* the song list on the playing tape's case card */
body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-case{position:relative;width:min(100%,calc(270 * var(--u)));aspect-ratio:480/720;background:var(--case) center/100% 100% no-repeat;filter:drop-shadow(0 3px 4px rgba(40,30,20,.3));transform:rotate(-1.5deg);margin-top:.3em}
body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-case ol.tape-songs{position:absolute;left:14%;right:9%;top:calc(var(--ruled) * 100% + .4em);margin:0!important;padding:0!important;border:0!important}
body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-case ol.tape-songs li{font-size:var(--t-control)!important;margin:0 0 .45em!important;color:#1b3591;line-height:1.15;list-style:decimal;list-style-position:inside}
body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-case ol.tape-songs li.playing::before{left:-1.05em}
@media (max-height:560px){body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-case{background:none;aspect-ratio:auto;filter:none;transform:none}body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-case ol.tape-songs{position:static;padding-left:1.2em!important}}
@media (max-width:700px){body.locker-hub #desk-dialog #dialog-content .walkman-deck{padding-left:0!important}body.locker-hub #desk-dialog #dialog-content ol.tape-list .tape-art{flex-basis:88px!important}body.locker-hub #desk-dialog #dialog-content ol.tape-list img.tape-photo{width:40px!important}body.locker-hub #desk-dialog #dialog-content ol.tape-list .tape-note{display:none}body.locker-hub #desk-dialog #dialog-content ol.tape-list button.tape{gap:10px!important}}

body.locker-hub #desk-dialog #dialog-content h3.settings-group{margin:.55em 0 .1em!important;padding:0 0 .05em!important;font-family:Hand,Schoolhand,sans-serif!important;font-weight:normal!important;font-size:var(--t-body)!important;color:#b03a2e!important;border-bottom:1.5px solid rgba(176,58,46,.35);letter-spacing:.02em}
body.locker-hub #desk-dialog #dialog-content h3.settings-group:first-child{margin-top:0!important}
/* the wide settings title stays clear of the sheet's edges */
body.locker-hub #desk-dialog[data-screen=settings] #dialog-title span[class^=heading-]{height:calc(var(--t-head) * .8)!important}

/* Settings fit one sheet in every language: a capped title (1.15: the letters of the one-line titles match the other pages in English, Spanish and Italian), tighter rows, the controller line small. */
html body.locker-hub #desk-dialog[data-screen=settings] #dialog-title span.heading-settings.heading-settings.heading-settings.heading-settings{max-height:calc(var(--t-head) * 1.15)!important;max-width:100%!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-title{margin-bottom:.15em!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content h3.settings-group{margin:.3em 0 0!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .options button{padding-top:.06em!important;padding-bottom:.06em!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .actions{margin:.35em 0 0!important}
/* Its four links stay on one row in every language (a second row was pushed under the ruler). */
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .actions{display:flex!important;flex-wrap:nowrap!important;justify-content:center!important;gap:.4em!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .actions button{white-space:nowrap!important;padding-left:.35em!important;padding-right:.35em!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .controller-status{margin:.2em 0 0!important;font-size:var(--t-meta)!important}

/* The sticker collection page (swap stickers): its lettered heading in five languages and the sheet as its icon. */
body.locker-hub #desk-dialog #dialog-title .heading-stickers{display:inline-block;height:calc(var(--t-head) * 1.22);color:transparent!important;font-size:0;overflow:hidden;background-position:left center;background-size:contain;background-repeat:no-repeat;aspect-ratio:4.42;background-image:url(@@asset:assets/ui/headings/collection.webp@@)}
html[lang=fr] body.locker-hub #desk-dialog #dialog-title span.heading-stickers.heading-stickers.heading-stickers{aspect-ratio:2.48!important;background-image:url(@@asset:assets/ui/headings/fr/collection.webp@@)!important;height:calc(var(--t-head) * 1.55)!important}
html[lang=es] body.locker-hub #desk-dialog #dialog-title span.heading-stickers.heading-stickers.heading-stickers{aspect-ratio:3.885!important;background-image:url(@@asset:assets/ui/headings/es/collection.webp@@)!important}
html[lang=de] body.locker-hub #desk-dialog #dialog-title span.heading-stickers.heading-stickers.heading-stickers{aspect-ratio:3.8!important;background-image:url(@@asset:assets/ui/headings/de/collection.webp@@)!important}
html[lang=it] body.locker-hub #desk-dialog #dialog-title span.heading-stickers.heading-stickers.heading-stickers{aspect-ratio:4.975!important;background-image:url(@@asset:assets/ui/headings/it/collection.webp@@)!important}
/* the sticker collection on sticker release paper */body.locker-hub #desk-dialog[data-screen=stickers]:not(.backpack-dialog){background-image:url(@@asset:assets/ui/dlg-sheet-release.webp@@)!important}
body.locker-hub #desk-dialog[data-screen=stickers] #dialog-title::before{display:block!important;content:''!important;background:url(@@asset:assets/ui/stickers/collection-icon.webp@@) center/contain no-repeat!important;width:calc(var(--t-head) * 1.15)!important;height:calc(var(--t-head) * 1.15)!important;transform:rotate(-4deg);filter:drop-shadow(0 3px 3px rgba(40,30,20,.3));margin-top:calc(var(--t-head) * -.2)}
body.locker-hub #desk-dialog #dialog-content .sticker-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,15em),1fr));gap:.6em 1.2em;margin:.2em 0 .4em;max-height:58vh;overflow-y:auto;padding:.2em .6em .2em .2em;scrollbar-width:thin}/* one scroller on the sticker collection (Windows showed two scroll bars, the sheet's and the list's): the sheet stops scrolling and the list fills the rest of it, its bar a slim stroke of her blue ink with no arrows, the paper fading at its foot */body.locker-hub #desk-dialog #dialog-content:has(> .sticker-grid),body.locker-hub #desk-dialog #dialog-content:has(.sticker-grid){display:flex!important;flex-direction:column;overflow:hidden!important}body.locker-hub #desk-dialog #dialog-content:has(.sticker-grid)>*{flex-shrink:0}body.locker-hub #desk-dialog #dialog-content:has(.sticker-grid){padding-bottom:max(44px,calc(48 * var(--u)))!important}body.locker-hub #desk-dialog #dialog-content .sticker-grid{flex:1 1 auto!important;min-height:0;max-height:none;overscroll-behavior:contain;-webkit-mask-image:linear-gradient(#000 calc(100% - 1.6em),transparent);mask-image:linear-gradient(#000 calc(100% - 1.6em),transparent);padding-bottom:1.4em}@supports not selector(::-webkit-scrollbar){body.locker-hub #desk-dialog #dialog-content .sticker-grid{scrollbar-width:thin;scrollbar-color:rgba(27,53,145,.45) transparent}}@supports selector(::-webkit-scrollbar){body.locker-hub #desk-dialog #dialog-content .sticker-grid{scrollbar-width:auto;scrollbar-color:auto}body.locker-hub #desk-dialog #dialog-content .sticker-grid::-webkit-scrollbar{width:8px}body.locker-hub #desk-dialog #dialog-content .sticker-grid::-webkit-scrollbar-button{display:none;height:0}body.locker-hub #desk-dialog #dialog-content .sticker-grid::-webkit-scrollbar-track{background:transparent}body.locker-hub #desk-dialog #dialog-content .sticker-grid::-webkit-scrollbar-thumb{background:rgba(27,53,145,.42);border-radius:4px 3px 5px 3px;border:2px solid transparent;background-clip:padding-box}body.locker-hub #desk-dialog #dialog-content .sticker-grid::-webkit-scrollbar-thumb:hover{background-color:rgba(27,53,145,.7)}}/* denser cards so the fifteen stickers take a short scroll: several to a row, a smaller sticker, actions that wrap */body.locker-hub #desk-dialog #dialog-content .sticker-grid{grid-template-columns:repeat(auto-fill,minmax(min(100%,11.5em),1fr));gap:.2em 1.4em;align-content:start}body.locker-hub #desk-dialog #dialog-content .sticker-card{grid-template-columns:3.2em 1fr;align-items:start;align-content:start;gap:.1em .6em;padding:.45em .1em .55em}body.locker-hub #desk-dialog #dialog-content .sticker-card img{width:3.2em;height:3.2em;grid-row:span 5;margin-top:.15em}body.locker-hub #desk-dialog #dialog-content .sticker-grid{overflow-x:hidden}body.locker-hub #desk-dialog #dialog-content .sticker-card,body.locker-hub #desk-dialog #dialog-content .sticker-card>*{min-width:0;overflow-wrap:anywhere}body.locker-hub #desk-dialog #dialog-content .sticker-card :is(button.sticker-go,button.sticker-door){white-space:normal!important;text-align:left;margin-top:.1em;max-width:100%!important;line-height:1.2!important;padding-top:.15em!important;padding-bottom:.15em!important}body.locker-hub #desk-dialog #dialog-content .sticker-card :is(strong,.into){line-height:1.15}body.locker-hub #desk-dialog #dialog-content p.sticker-intro{margin-bottom:.15em!important}/* the collection as one page of tiles: five to a row, every sticker in sight; the chosen one's effect and actions in the strip below */body.locker-hub #desk-dialog #dialog-content .sticker-intro-row{display:flex;flex-wrap:wrap;column-gap:.35em}body.locker-hub #desk-dialog #dialog-content .sticker-intro-row p.sticker-intro{margin:0 0 .2em!important;line-height:1.3!important}body.locker-hub #desk-dialog #dialog-content .sticker-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:calc(1 * var(--ui,1px)) calc(10 * var(--ui,1px))!important;-webkit-mask-image:none!important;mask-image:none!important;padding:.2em .3em 0!important;align-content:start}body.locker-hub #desk-dialog #dialog-content .sticker-tile{all:unset;box-sizing:border-box;display:grid;justify-items:center;align-content:start;gap:calc(2 * var(--ui,1px));padding:calc(2 * var(--ui,1px)) calc(4 * var(--ui,1px));text-align:center;cursor:pointer;border-radius:calc(10 * var(--ui,1px)) calc(6 * var(--ui,1px)) calc(12 * var(--ui,1px)) calc(7 * var(--ui,1px));min-width:0}body.locker-hub #desk-dialog #dialog-content .sticker-tile img{width:calc(64 * var(--ui,1px));height:calc(64 * var(--ui,1px));object-fit:contain;filter:drop-shadow(0 2px 2px rgba(40,30,20,.35));transform:rotate(var(--tilt,-3deg))}body.locker-hub #desk-dialog #dialog-content .sticker-tile strong{font-size:var(--t-meta)!important;color:#243543;line-height:1.1;overflow-wrap:anywhere}body.locker-hub #desk-dialog #dialog-content .sticker-tile .into{font-size:var(--t-meta)!important;color:#b03a2e;line-height:1.1;overflow-wrap:anywhere}body.locker-hub #desk-dialog #dialog-content .sticker-tile.locked img{filter:grayscale(1) brightness(1.15);opacity:.35}body.locker-hub #desk-dialog #dialog-content .sticker-tile.locked :is(strong,.into){opacity:.55}body.locker-hub #desk-dialog #dialog-content .sticker-tile.chosen{background:rgba(255,222,120,.42)}body.locker-hub #desk-dialog #dialog-content .sticker-detail{flex:0 0 auto;display:grid;grid-template-columns:auto 1fr auto;align-items:center;column-gap:.8em;min-height:calc(64 * var(--ui,1px));margin-top:.15em;padding-top:.2em;border-top:1px dashed #24354340}body.locker-hub #desk-dialog #dialog-content .sticker-head{display:grid;justify-items:start}body.locker-hub #desk-dialog #dialog-content .sticker-detail strong{font-size:var(--t-control)!important;color:#243543;white-space:nowrap}body.locker-hub #desk-dialog #dialog-content .sticker-detail .into{font-size:var(--t-meta)!important;color:#b03a2e;white-space:nowrap}body.locker-hub #desk-dialog #dialog-content .sticker-detail p{margin:0!important;font-size:var(--t-meta)!important;line-height:1.25}body.locker-hub #desk-dialog #dialog-content .sticker-acts{display:flex;gap:.6em;align-items:center}body.locker-hub #desk-dialog #dialog-content .sticker-acts button{white-space:nowrap!important;width:auto!important;font-size:var(--t-control)!important;line-height:1.2!important}@media (max-width:900px),(max-height:620px){body.locker-hub #desk-dialog #dialog-content .sticker-grid{grid-template-columns:repeat(auto-fill,minmax(92px,1fr))!important;min-height:22vh}body.locker-hub #desk-dialog #dialog-content .sticker-tile :is(strong,.into){overflow-wrap:normal!important;word-break:normal!important}body.locker-hub #desk-dialog #dialog-content .sticker-tile img{width:max(36px,calc(64 * var(--ui,1px)))!important;height:max(36px,calc(64 * var(--ui,1px)))!important}body.locker-hub #desk-dialog #dialog-content .sticker-detail{grid-template-columns:auto minmax(0,1fr) auto;column-gap:.6em;row-gap:0;min-height:0}body.locker-hub #desk-dialog #dialog-content .sticker-head{grid-auto-flow:column;column-gap:.4em;align-items:baseline}body.locker-hub #desk-dialog #dialog-content .sticker-detail p{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}body.locker-hub #desk-dialog #dialog-content .sticker-acts{flex-wrap:nowrap;column-gap:.8em}body.locker-hub #desk-dialog #dialog-content .sticker-detail .sticker-head .into{display:none}}
body.locker-hub #desk-dialog #dialog-content .sticker-card{display:grid;grid-template-columns:4.2em 1fr;gap:.2em .8em;align-items:center;padding:.35em .2em;border-bottom:1px dashed #24354340}
body.locker-hub #desk-dialog #dialog-content .sticker-card img{width:4.2em;height:4.2em;object-fit:contain;grid-row:span 4;filter:drop-shadow(0 2px 2px rgba(40,30,20,.35));transform:rotate(var(--tilt,-3deg))}
body.locker-hub #desk-dialog #dialog-content .sticker-card.locked img{filter:grayscale(1) brightness(1.15);opacity:.35}
body.locker-hub #desk-dialog #dialog-content .sticker-card strong{font-size:var(--t-control);color:#243543;line-height:1.1}
body.locker-hub #desk-dialog #dialog-content .sticker-card .into{color:#b03a2e;font-size:var(--t-meta)}
body.locker-hub #desk-dialog #dialog-content .sticker-card p{margin:0!important;font-size:var(--t-meta)!important;line-height:1.25}
body.locker-hub #desk-dialog #dialog-content .sticker-card button.sticker-go{grid-column:2;justify-self:start;margin-top:.2em;white-space:nowrap;width:auto!important;max-width:100%;writing-mode:horizontal-tb}
body.locker-hub #desk-dialog #dialog-content .sticker-card button.sticker-door{grid-column:2;justify-self:start;margin-top:.15em;white-space:nowrap;width:auto!important;max-width:100%;writing-mode:horizontal-tb;font-size:.85em;opacity:.85}
body.locker-hub #desk-dialog #dialog-content .sticker-card button.sticker-door[aria-pressed=true]{opacity:1;text-decoration:underline wavy rgba(192,57,43,.6)}
body.locker-hub #desk-dialog #dialog-content .sticker-card button.sticker-door:disabled{opacity:.45;cursor:default}
/* short screens (phones on their side): a one-line intro, smaller stickers, two columns, the list as tall as the page allows */
@media (max-height:520px){body.locker-hub #desk-dialog #dialog-content p.sticker-intro{font-size:12px!important;margin:0 0 .3em!important;line-height:1.25}body.locker-hub #desk-dialog #dialog-content .sticker-grid{max-height:calc(100vh - 160px);grid-template-columns:1fr;gap:0}body.locker-hub #desk-dialog #dialog-content .sticker-card{grid-template-columns:34px auto 1fr;grid-template-rows:auto auto;gap:0 .6em;padding:.2em 0}body.locker-hub #desk-dialog #dialog-content .sticker-card img{width:34px;height:34px;grid-row:span 2}body.locker-hub #desk-dialog #dialog-content .sticker-card strong{font-size:14px!important}body.locker-hub #desk-dialog #dialog-content .sticker-card .into{font-size:13px!important;align-self:end}body.locker-hub #desk-dialog #dialog-content .sticker-card p{grid-column:2 / span 2;font-size:12px!important}body.locker-hub #desk-dialog #dialog-content .sticker-card button.sticker-go{grid-column:3;grid-row:1;justify-self:end;font-size:12px!important;padding:.1em .5em!important;margin:0}}
/* sticker collection: the tiles on the left, the chosen sticker's card on the right with its big sticker, where it plays, what it does or how to earn it, and its two actions stacked; a tile is chosen by a click or the arrows, never by hover */body.locker-hub #desk-dialog #dialog-content .sticker-body{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(12em,27%);column-gap:calc(18 * var(--ui,1px));align-items:start}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important;row-gap:calc(10 * var(--ui,1px))!important;max-height:100%;overflow-y:auto}
body.locker-hub #desk-dialog #dialog-content .sticker-tile{padding:calc(6 * var(--ui,1px)) calc(4 * var(--ui,1px)) calc(5 * var(--ui,1px))!important;transition:background .15s,transform .15s}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-tile strong{overflow-wrap:normal!important;word-break:normal!important;hyphens:none;font-size:var(--t-meta)!important}body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-grid{column-gap:calc(4 * var(--ui,1px))!important}body.locker-hub #desk-dialog #dialog-content .sticker-tile:hover{background:rgba(27,53,145,.06)}
body.locker-hub #desk-dialog #dialog-content .sticker-tile.chosen{background:rgba(255,222,120,.5)!important;box-shadow:0 0 0 2px rgba(27,53,145,.55);transform:translateY(-2px)}
body.locker-hub #desk-dialog #dialog-content .sticker-tile.chosen img{transform:rotate(0deg) scale(1.08)}
body.locker-hub #desk-dialog #dialog-content .sticker-tile{position:relative}body.locker-hub #desk-dialog #dialog-content .sticker-tile.on-door::after{content:'';position:absolute;top:calc(4 * var(--ui,1px));right:calc(10 * var(--ui,1px));width:calc(11 * var(--ui,1px));height:calc(11 * var(--ui,1px));min-width:7px;min-height:7px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff8a7a,#c0392b 55%,#7d1f16);box-shadow:0 2px 2px rgba(40,20,10,.35)}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-detail>*{flex-shrink:0}body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-detail{max-height:100%;overflow-y:auto;scrollbar-width:none;display:flex!important;flex-direction:column;align-items:center;text-align:center;gap:calc(8 * var(--ui,1px));margin:0!important;padding:calc(14 * var(--ui,1px)) calc(16 * var(--ui,1px))!important;border:none!important;border-left:2px dashed rgba(36,53,67,.25)!important;min-height:0}
body.locker-hub #desk-dialog #dialog-content .sticker-big{width:calc(120 * var(--ui,1px));height:calc(120 * var(--ui,1px));object-fit:contain;filter:drop-shadow(0 3px 3px rgba(40,30,20,.35));transform:rotate(-3deg)}
body.locker-hub #desk-dialog #dialog-content .sticker-big.locked{filter:grayscale(1) brightness(1.15);opacity:.4}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-head{display:grid!important;grid-auto-flow:row!important;justify-items:center;gap:calc(2 * var(--ui,1px))}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-head strong{font-size:var(--t-body)!important;white-space:normal}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-head .into{display:block!important;font-size:var(--t-meta)!important;color:#b03a2e;white-space:normal}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-detail p{font-size:var(--t-meta)!important;line-height:1.35;display:block!important;-webkit-line-clamp:unset;overflow:visible;max-width:22em}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-acts{flex-direction:column;align-items:stretch;gap:calc(8 * var(--ui,1px));width:100%;margin-top:calc(4 * var(--ui,1px))}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-acts button{width:100%!important;white-space:normal!important;text-align:center}
@media (max-height:620px) and (min-width:701px){body.locker-hub #desk-dialog #dialog-content .sticker-body{grid-template-columns:minmax(0,1fr) minmax(11em,30%);column-gap:.8em}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-detail{gap:.15em;padding:0 .5em!important}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-big{display:none}body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-acts{display:none!important}body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-head{justify-items:center}body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-head{grid-auto-flow:column!important;column-gap:.4em;align-items:baseline}body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-detail{justify-content:flex-start}body.locker-hub #desk-dialog #dialog-content .sticker-body{height:100%}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-detail p{display:-webkit-box!important;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-acts{gap:.25em;margin-top:0}
body.locker-hub #desk-dialog #dialog-content .sticker-intro-row p.sticker-intro:nth-child(2){display:none}}
@media (max-width:700px){body.locker-hub #desk-dialog #dialog-content .sticker-body{display:flex!important;flex-direction:column;gap:.3em;overflow-y:auto;scrollbar-width:none;min-height:0}
body.locker-hub #desk-dialog #dialog-content .sticker-intro-row{display:none!important}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-grid{height:auto;max-height:none!important;overflow:visible!important;flex:0 0 auto!important;min-height:0!important}body.locker-hub #desk-dialog #dialog-content .sticker-tile strong{display:none}body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-detail p{display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:var(--t-meta)!important}body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-acts{display:none!important}
body.locker-hub #desk-dialog #dialog-content .sticker-tile strong{display:none}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-detail{max-height:none!important;overflow:visible!important;order:2;display:grid!important;grid-template-columns:auto minmax(0,1fr);text-align:left;align-items:center;justify-items:start;border-left:none!important;border-top:2px dashed rgba(36,53,67,.25)!important;padding:.3em 0 0!important;column-gap:.6em;row-gap:.15em}
body.locker-hub #desk-dialog #dialog-content .sticker-big{width:44px;height:44px;grid-row:span 2}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-head{justify-items:start}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-detail p{grid-column:1 / -1}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-acts{flex-direction:row;flex-wrap:wrap;grid-column:1 / -1}
body.locker-hub #desk-dialog #dialog-content .sticker-body .sticker-acts button{width:auto!important}}
`;
g.No2Locker={LockerRenderer,SPINES,PROPS,SPREAD,PLAY};
})(globalThis);
