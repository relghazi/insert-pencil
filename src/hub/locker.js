
(function(g){
'use strict';
// Locker hub (owner 2026-10-24): one painted image of her open school locker. The notebooks on the middle shelf,
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
  // The Walkman behind the pencil pouch (owner 2026-10-29): mixtapes.
  walkman:{x:2030,y:20,w:380,h:440,label:'mixtapes'},
  // The desk globe on the top shelf (owner 2026-10-30): the language.
  globe:{x:2570,y:240,w:300,h:410,label:'language'},
  // The detention slip behind her sneaker (owner 2026-10-27): write up a problem.
  report:{x:2555,y:2680,w:200,h:230,label:'write it up'},
  // The volleyball behind her sneaker (owner 2026-10-30: easier to see and choose than the sneaker) opens the gym report.
  shoe:{x:2440,y:2430,w:305,h:250,label:'gym report'},
  // The tear-off calendar page on the door (owner 2026-10-30): today's daily challenge.
  daily:{x:3330,y:570,w:270,h:350,label:'daily challenge'}
};
// The selection label is written on the painted 3 x 5 index card taped to the door (the card's face).
const NOTE={x:3660,y:2195,w:530,h:365};
// Open notebook (owner 2026-10-24): a two-page spread over the dimmed locker; for play the notebook turns a quarter
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
    // Esc goes back to the title screen (no on-screen slip, owner 2026-10-25).
    const toTitle=()=>{const n=g.No2;if(!n||this.openBook||this.busy||n.intro?.active||$('desk-dialog')?.open||document.body.dataset.view!=='hub')return false;n.intro.start(false);return true};// Only an Escape nothing else used (closing a dialog or the bag prevents its default first) goes back to the title.
    window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented&&!e.repeat&&toTitle())e.preventDefault()});
    const imgs=await Promise.all(['env/locker-1.png','env/locker-2.png','env/locker-3.png','env/locker-letters-1.png','env/locker-letters-2.png','env/locker-letters-3.png','env/locker-bag-peek.png'].map(loadImage));
    this.arts=imgs.slice(0,3);this.letters=imgs.slice(3,6);this.bagPeekArt=imgs[6];this.covers=new Map();
    // The pulled-out frames load after the locker is up; until one has, choosing that thing shows nothing extra.
    this.pulls={};loadImage('env/locker-globe-map.png').then(im=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const q=c.getContext('2d');q.drawImage(im,0,0);this.globeMap={w:im.width,h:im.height,d:q.getImageData(0,0,im.width,im.height).data}},()=>{});loadImage('env/locker-globe-rim.png').then(im=>{this.globeRim=im},()=>{});loadImage('env/locker-volleyball-front.png').then(im=>{this.ballMask=im},()=>{});loadImage('env/locker-volleyball-shape.png').then(im=>{this.ballShape=im},()=>{});for(const k of Object.keys(g.LockerPull||{}).filter(k=>k!=='labels'&&k!=='globe3d'))loadImage('env/locker-pull-'+k+'.png').then(i=>{this.pulls[k]=i;if(this.lift===k)this.draw()},()=>{});
    // The backpack's other notebooks (owner 2026-10-27): until it has been opened once, a notebook rises out of it a
    // little after you arrive and again whenever the locker sits idle; never with reduced motion.
    try{this.bagSeen=localStorage.getItem('No2Arcade:bag-seen')==='1'}catch{this.bagSeen=false}
    this.nudgeAt=0;this.nudgeT=-1;this.activeAt=performance.now();
    for(const ev of ['keydown','pointerdown','pointermove'])addEventListener(ev,()=>{this.activeAt=performance.now()},{passive:true});
    setInterval(()=>{const now=performance.now(),idle=this.lockerIdle();if(!idle){this.nudgeAt=this.nudgeAt||now;return}
      const first=!this.nudged,wait=first?2500:20000;if(this.bagSeen||this.nudgeT>=0||g.No2?.services?.save?.settings?.reduced)return;
      if(now-this.nudgeAt>=wait&&now-this.activeAt>(first?2500:8000))this.nudge()},500);
    document.body.classList.add('locker-hub');const st=document.createElement('style');st.textContent=LOCKER_CSS+(g.No2HeadingCSS||'');document.head.append(st);
    const dlg=$('desk-dialog');if(dlg)new MutationObserver(()=>this.paintNote()).observe(dlg,{attributes:true,attributeFilter:['open']});
    addEventListener('pointermove',e=>{this.pointerLow=e.clientY>innerHeight*.88});
    setInterval(()=>{if(!this.openBook||!this.playView()){this.peek=0;document.body.classList.remove('tabs-hidden');return}
      const a=g.No2?.adapter,paused=!!(a?.suspended||a?.api?.get?.()?.paused),want=paused||this.pointerLow?1:0,was=this.peek||0;
      this.peek=was+Math.max(-.25,Math.min(.25,want-was));document.body.classList.toggle('tabs-hidden',this.peek<.6);
      if(this.peek!==was){this.draw();this.layoutPages(a?.aspect||[1440,780])}},50);
    new MutationObserver(()=>{if(this.openBook&&!this.busy){this.draw();g.No2?.services&&this.layoutPages(g.No2.adapter?.aspect||[1440,780])}}).observe(document.body,{attributes:true,attributeFilter:['data-view']});
    this.gate={setGlance(){},clearLabel:()=>{},notifyInput(){},focus(){},label:this.label};
    g.No2HubHelpDevice=d=>{this.device=d;this.paintNote()};
    c.addEventListener('pointermove',e=>{if(this.blocked())return;const id=this.pick(e);if(id)$('desk-'+id)?.focus({preventScroll:true})});
    c.addEventListener('click',e=>{if(this.blocked())return;const id=this.pick(e);if(id)$('desk-'+id)?.click()});
    this.resize();return this;
  }
  blocked(){return this.busy||!!this.openBook||!!g.No2?.intro?.active||!!$('desk-dialog')?.open}
  get bagOpen(){return false}set bagOpen(v){}
  ids(){const all=g.No2Catalog.notebooks.map(n=>n.id);return all.slice(this.set*PER_SET,this.set*PER_SET+PER_SET)}
  sets(){return Math.ceil(g.No2Catalog.notebooks.length/PER_SET)}
  // Cover the window with the painting (it is 16:9); keep the locker and door centred when the window is narrower.
  // Play view: close in on the page alone; pull back to show the tabs while paused or when the pointer nears the bottom.
  get art(){return this.arts?.[this.set]}
  view(){if(this.openBook&&this.playView()){const W=innerWidth,H=innerHeight-(g.No2RulerH?.()||0),G=this.gameBox(),pad=30,k=this.peek||0;
      const near=this.fitView(W,H,{l:G.x-pad,r:G.x+G.w+pad,t:G.y-pad,b:G.y+G.h+pad});if(!k)return near;
      // Pulled back (paused, or the pointer near the bottom): the whole page and its five tabs.
      const far=this.fitView(W,H,{l:1440,r:4060,t:PAGES.turned.y-40,b:2770});return{s:near.s+(far.s-near.s)*k,x:near.x+(far.x-near.x)*k,y:near.y+(far.y-near.y)*k}}
    // Cover the window, but never crop what matters: the whole locker, or the whole open notebook with its tabs.
    // On very wide or tall windows this leaves margins, filled by a blurred copy of the same painting (see draw).
    const W=innerWidth,H=innerHeight,k=this.openBook?{x:560,y:200,w:4380,h:2800}:{x:1150,y:0,w:3400,h:3072},FH=innerHeight,s=Math.min(Math.max(W/IW,FH/IH),W/k.w,H/k.h);
    const place=(len,img,c)=>img<=len?(len-img)/2:Math.min(0,Math.max(len-img,len/2-c*s));
    // The action ruler lies over the bottom of the painting (owner 2026-10-30): nothing is reserved for it here.
    // On the open notebook the five tabs must stay clear of the ruler: where the slimmed ruler still cannot fit under
    // them (phones, short windows), the spread shrinks just enough to lift them above it.
    if(this.openBook){const rh=Math.round(Math.max(52,Math.min(84,innerHeight*.072))*.7)+8,t=SPREAD.tabs[0],y=place(H,IH*s,k.y+k.h/2),bottom=y+(t.y+t.h)*s;
     if(bottom>H-rh){const s2=Math.min(s,(H-rh)/(k.y+k.h-(k.y-0))),s3=Math.min(s2,(H-rh)/((t.y+t.h)-k.y+20));return{s:s3,x:place(W,IW*s3,k.x+k.w/2),y:H-rh-(t.y+t.h)*s3}}}
    return{s,x:place(W,IW*s,k.x+k.w/2),y:place(H,IH*s,k.y+k.h/2)}}
  // The play page's view: the plate rect R (the game while playing, the page and tabs while pulled back) as large as the
  // window allows, with the close and number tags never on the paper: either on the locker beside the paper or on the
  // cover above it, whichever lets R be bigger. The page's far edge and curled corner may leave the window; R never does.
  fitView(W,H,R){const P=PAGES.turned,tw=this.tagW||0,th=this.tagH||0,rw=R.r-R.l;
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
    this.ids().forEach((id,i)=>{const sp=SET_SPINES[this.set][i];out.push({key:id,id,notebook:true,label:g.No2Catalog.byId[id]?.title||id,bounds:this.toScreen(sp),art:sp})});
    for(const [id,r] of Object.entries(PROPS))out.push({key:id,id,notebook:false,label:id==='backpack'?(g.No2Catalog.notebooks.length-this.ids().length)+' more notebooks':r.label,bounds:this.toScreen(r),art:r});
    return out}
  regionFor(id){return this.regions().find(r=>r.key===id)}
  pick(e){const r=this.regions().find(r=>{const b=r.bounds;return e.clientX>=b.x&&e.clientX<=b.x+b.w&&e.clientY>=b.y&&e.clientY<=b.y+b.h});return r?r.key:null}
  render(layout,lift){if(this.busy||this.openBook)return;if(lift!==this.lift||this.key===''){if(lift!==this.lift)this.activeAt=performance.now();this.lift=lift;this.key='locker';this.draw();this.paintNote()}}
  draw(){const c=this.canvas,x=c.getContext('2d');if(!this.art)return;const dpr=Math.min(2,devicePixelRatio||1),W=innerWidth,H=innerHeight;
    if(c.width!==Math.round(W*dpr)||c.height!==Math.round(H*dpr)){c.width=Math.round(W*dpr);c.height=Math.round(H*dpr)}
    x.setTransform(dpr,0,0,dpr,0,0);const v=this.view();x.imageSmoothingQuality='high';
    // The ruler lies over the painting (owner 2026-10-30); on the open spread it slims down to fit under the tabs, so the
    // tabs stay clear without shrinking the page.
    {const ru=document.getElementById('action-ruler');if(ru){const was=parseFloat(ru.style.getPropertyValue('--rh'))||1;
     if(this.openBook&&!this.playView()){const base=ru.offsetHeight/was||72,free=innerHeight-(v.y+(SPREAD.tabs[0].y+SPREAD.tabs[0].h)*v.s)-4,rh=Math.max(.7,Math.min(1,free/base));if(Math.abs(rh-was)>.01)ru.style.setProperty('--rh',rh.toFixed(3))}
     else if(was!==1)ru.style.removeProperty('--rh');if(ru.style.left)ru.style.left=''}}
    if(v.x>0||v.y>0||v.x+IW*v.s<W-1||v.y+IH*v.s<H-1){const cs=Math.max(W/IW,H/IH);x.save();x.filter='blur(14px) brightness(.7)';x.drawImage(this.art,(W-IW*cs)/2,(H-IH*cs)/2,IW*cs,IH*cs);x.restore()}
    const pulled=!this.openBook&&this.lift&&this.regionFor(this.lift),moved=null;
    // Under a pulled-out notebook's block the titles are left off: the block has them painted in.
    const paint=()=>{x.drawImage(this.art,v.x,v.y,IW*v.s,IH*v.s);x.save();if(moved){x.beginPath();x.rect(0,0,W,H);x.rect(v.x+moved.x*v.s,v.y+moved.y*v.s,moved.w*v.s,moved.h*v.s);x.clip('evenodd')}x.drawImage(this.letters[this.set],v.x,v.y,IW*v.s,IH*v.s);x.restore();if(!this.openBook)this.paintBag(x,v);this.paintCalendar(x,v)};
    paint();
    const r=this.lift&&this.regionFor(this.lift);
    if(r&&!this.openBook)this.pullOut(x,v,r);
    if(this.dim){x.fillStyle='rgba(20,24,40,'+(.45*this.dim)+')';x.fillRect(0,0,W,H)}
    // An open notebook: the spread (or, on the play page, the turned notebook) painted over the dimmed locker.
    if(this.openBook){const c=this.cover,plate=c&&(this.playView()?c.play:c.spread);if(plate){x.save();x.globalAlpha=this.playView()?1:this.dim;x.drawImage(plate,v.x,v.y,IW*v.s,IH*v.s);this.drawPaper(x,v);
      x.restore()}}
  }
  // The index card taped inside the door names the chosen thing and how to open it.
  paintNote(){const el=this.label;if(!el)return;const b=this.toScreen(NOTE),show=!this.openBook&&!this.busy&&!g.No2?.intro?.active&&!$('desk-dialog')?.open;
    Object.assign(el.style,{left:b.x+'px',top:b.y+'px',width:b.w+'px',height:b.h+'px',display:show?'flex':'none'});
    const r=this.lift&&this.regionFor(this.lift),xb=this.device==='xbox',glyph=k=>g.No2UI?.glyph?g.No2UI.glyph(k,xb?'xbox':'keyboard'):k;
    // With nothing chosen yet the card says where the rest of the notebooks are, until the backpack has been opened.
     const all=g.No2Catalog.notebooks.length,here=this.ids().length,hint=!r&&!this.bagSeen?all+' notebooks: '+here+' here, '+(all-here)+' in my bag':'';
     const more=!this.bagSeen&&r?.notebook?'<div class="note-more">+'+(all-here)+' more in my bag \u2193</div>':'';
     // The key and its word live on the action ruler (owner 2026-10-30); the card only names what is chosen.
     const ruled=document.body.classList.contains('has-ruler');
     el.innerHTML='<div class="note-name">'+(r?r.label:hint)+'</div>'+(hint||ruled?'':'<div>'+glyph(xb?'A':'Enter')+(r?.key==='backpack'?' look':' open')+'</div>')+more;
    for(const i of el.querySelectorAll('img'))Object.assign(i.style,{verticalAlign:'-0.25em'});
    // A long name drops to control size and wraps so the label stays on the note.
    const nm=el.firstChild;nm.classList.remove('long');if(nm.offsetHeight>parseFloat(getComputedStyle(nm).fontSize)*1.5||nm.scrollWidth>el.clientWidth)nm.classList.add('long')}
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
    // Locker Gauntlet's first doodle is its four students in a row (owner 2026-10-30), so it takes a wide slot.
    const spots=n.id==='locker-gauntlet'?[[.08,.28,.8,.2,-2],[.52,.5,.34,.46,5],[.12,.72,.3,.25,-3]]:[[.12,.29,.34,.4,-6],[.52,.5,.34,.46,5],[.12,.72,.3,.25,-3]];
    [...box.querySelectorAll('img')].forEach((im,i)=>{const [x,y,w,h,rot]=spots[i%3],fit=()=>{const r=im.naturalWidth?im.naturalHeight/im.naturalWidth:1,iw=Math.min(w*L.w,h*L.h/r);Object.assign(im.style,{left:(x*L.w+(w*L.w-iw)/2)+'px',top:y*L.h+'px',width:iw+'px',transform:'rotate('+rot+'deg)'})};fit();if(!im.complete)im.onload=fit})}
  // Page turn (prototype, owner 2026-10-27): a tab to a later page lifts the right page and lays it over the left one, an earlier
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
  // A chosen notebook's name sticker lights up (owner 2026-10-28, after the zoom, lean, highlight and painted pull-outs):
  // the sticker in its painted shape turns brighter with a soft glow around it and its title on top; nothing moves.
  // The sketchbook's moon glows; other props lift off the door or shelf in their approved painted frames (tools/pack-locker-pull.py keeps only what the edit
  // changed, softly edged). Either fades in over about 150 ms, instantly with reduced motion; the backpack shows its peek.
  // One frame at a time for the locker's own animations (owner 2026-10-30, slow hovers): every draw used to ask for another
  // frame, so each hover or fade started one more chain of redraws and the chains piled up until input waited for seconds.
  // One redraw per display frame for whatever is chosen now; a frame asked for by the previous choice still draws the new one,
  // so a quick move from one thing to the next never leaves the new animation waiting.
  frame(){if(this.framePending)return;this.framePending=requestAnimationFrame(()=>{this.framePending=0;if(this.lift&&!this.openBook)this.draw()})}
  pullOut(x,v,r){const now=performance.now();if(this.pullKey!==r.key){this.pullKey=r.key;this.pullAt=now}
   const reduced=g.No2?.services?.save?.settings?.reduced,raw=reduced?1:Math.min(1,(now-this.pullAt)/150),k=1-(1-raw)**3;if(raw<1)this.frame();
   const P=g.LockerPull?.[r.key],img=this.pulls?.[r.key],at=(q,p)=>[v.x+q.x*v.s,v.y+q.y*v.s,(q.w??q[2])*v.s,(q.h??q[3])*v.s];x.save();x.globalAlpha=k;
   if(r.notebook){const b=g.LockerPull?.labels?.[r.key];if(b){const[lx,ly,lw,lh]=b,f=this.art.width/IW,L=this.letters[this.set],fl=L.width/IW,d=at({x:lx,y:ly,w:lw,h:lh});
     // The glow stays on the shelf, never on the locker's walls.
     const S=SET_SPINES[this.set],c0=at({x:S[0].x,y:ly-200,w:S[S.length-1].x+S[S.length-1].w-S[0].x,h:lh+400});x.beginPath();x.rect(...c0);x.clip();
     x.shadowColor='rgba(255,248,226,1)';x.shadowBlur=40*v.s*IW/1920*k;x.filter='brightness(1.3) saturate(.8)';for(let p=0;p<2;p++)x.drawImage(this.art,lx*f,ly*f,lw*f,lh*f,...d);
     x.shadowColor='transparent';x.filter='none';x.drawImage(L,lx*fl,ly*fl,lw*fl,lh*fl,...d)}x.restore();return}
   // The sketchbook: the moon on its cover lights up (owner 2026-10-28), a warm glow over the painted moon.
   if(r.key==='intro'){const[cx,cy]=[v.x+1700*v.s,v.y+305*v.s],R=118*v.s;const gl=x.createRadialGradient(cx,cy,0,cx,cy,R*1.6);gl.addColorStop(0,'rgba(255,242,200,.7)');gl.addColorStop(.55,'rgba(255,238,185,.45)');gl.addColorStop(1,'rgba(255,236,180,0)');
    x.globalCompositeOperation='screen';x.fillStyle=gl;x.beginPath();x.arc(cx,cy,R*1.6,0,Math.PI*2);x.fill();x.restore();return}
   // The globe spins smoothly while it is chosen (owner 2026-10-30): her painted world map (Nano Banana) turned on the ball
   // in an orthographic view on its axis tilted 23.5 degrees like the Earth, leaning with the painted meridian ring (top to the right), turning west to east, lit from the painting's side, under the painted rim; held still with
   // reduced motion.
   // The daily calendar stays as painted (owner 2026-10-30): only its push pin works itself out of the door and back in,
   // drawn from the painting itself (cut out with its outline) and grown about its middle as it comes toward you, so it always covers the painted one, its shadow sliding off.
   // The volleyball lights up while it is chosen (owner 2026-10-30, simpler than turning it): the painted ball, cut to its own
   // shape, drawn brighter with a soft warm glow, the slip and sneaker drawn again in front. Chosen, it gives a little bounce
   // (it grows from where it rests, never smaller than painted, so the painted ball stays covered) and its glow breathes.
   // The detention slip glows in place like the volleyball beside it (owner 2026-10-30: its old lift frame carried the dark
   // wall that was behind it before the ball); chosen, it flutters on its tape and settles into a slow sway.
   // Held still with reduced motion.
   if(r.key==='report'){const f=this.art.width/IW,B=[2540,2660,220,260],Q=[[2603,2684],[2626,2675],[2746,2711],[2747,2731],[2731,2915],[2558,2915]],W=Math.round(B[2]*v.s),H=Math.round(B[3]*v.s),key=W+'x'+H+this.set;
    if(this.slipCutKey!==key){const c=Object.assign(document.createElement('canvas'),{width:W,height:H}),q=c.getContext('2d');q.beginPath();Q.forEach(([px,py],n)=>q[n?'lineTo':'moveTo']((px-B[0])*v.s,(py-B[1])*v.s));q.closePath();q.clip();q.drawImage(this.art,B[0]*f,B[1]*f,B[2]*f,B[3]*f,0,0,W,H);this.slipCut=c;this.slipCutKey=key}
    const t=(now-this.pullAt)/1000,still=g.No2?.services?.save?.settings?.reduced,a=still?0:.045*Math.exp(-2.5*t)*Math.sin(t*12)+.012*Math.sin(t*2.4),px=v.x+2655*v.s,py=v.y+2688*v.s;
    x.translate(px,py);x.rotate(a);x.scale(1.05,1.05);x.translate(-px,-py);
    x.shadowColor='rgba(255,246,214,1)';x.shadowBlur=44*v.s*IW/1920*k*(still?1:.8+.2*Math.sin(t*2.6));x.filter='brightness(1.28) saturate(.9)';for(let n=0;n<2;n++)x.drawImage(this.slipCut,v.x+B[0]*v.s,v.y+B[1]*v.s,W,H);x.restore();if(!still)this.frame();return}
   if(r.key==='shoe'){const f=this.art.width/IW,B=[2380,2380,420,520];if(!this.ballShape||!this.ballMask){x.restore();return}
    const W=Math.round(B[2]*v.s),H=Math.round(B[3]*v.s),key=W+'x'+H+this.set;
    if(this.ballCutKey!==key){const mk=(src,mask)=>{const c=Object.assign(document.createElement('canvas'),{width:W,height:H}),q=c.getContext('2d');q.drawImage(mask,0,0,W,H);q.globalCompositeOperation='source-in';q.drawImage(src,B[0]*f,B[1]*f,B[2]*f,B[3]*f,0,0,W,H);return c};
     this.ballCut=mk(this.art,this.ballShape);this.ballFrontCut=mk(this.art,this.ballMask);this.ballCutKey=key}
    const X=v.x+B[0]*v.s,Y=v.y+B[1]*v.s,t=(now-this.pullAt)/1000,still=g.No2?.services?.save?.settings?.reduced,b=still?0:Math.abs(Math.exp(-3*t)*Math.sin(t*11)),ax=X+216*v.s,ay=Y+425*v.s;
    x.save();x.translate(ax,ay);x.scale(1.03+.04*b,1.03+.09*b);x.translate(-ax,-ay);
    x.shadowColor='rgba(255,246,214,1)';x.shadowBlur=44*v.s*IW/1920*k*(still?1:.8+.2*Math.sin(t*2.6));x.filter='brightness(1.22) saturate(.9)';for(let n=0;n<2;n++)x.drawImage(this.ballCut,X,Y,W,H);x.restore();
    x.shadowColor='transparent';x.filter='none';x.globalAlpha=1;x.drawImage(this.ballFrontCut,X,Y,W,H);x.restore();if(!still)this.frame();return}
   if(r.key==='daily'){const reduced=g.No2?.services?.save?.settings?.reduced,f=this.art.width/IW,K=5504/3840,B=[2405*K,388*K,50*K,52*K];
    if(!this.pinSprite||this.pinSprite.art!==this.art){const c=document.createElement('canvas');c.width=Math.round(B[2]*f);c.height=Math.round(B[3]*f);const q=c.getContext('2d'),s=c.width/50;
     q.drawImage(this.art,B[0]*f,B[1]*f,B[2]*f,B[3]*f,0,0,c.width,c.height);q.globalCompositeOperation='destination-in';q.fillStyle='#000';q.beginPath();
     q.ellipse(33*s,14*s,10.5*s,10*s,-.5,0,Math.PI*2);q.moveTo(36*s,30*s);q.ellipse(22*s,30*s,14*s,11.5*s,-.5,0,Math.PI*2);/* one mask: a second destination-in pass would erase the first */q.moveTo(9*s,37*s);q.lineTo(18*s,38*s);q.lineTo(16*s,49*s);q.lineTo(8*s,48*s);q.closePath();q.fill();this.pinSprite={c,art:this.art}}
    // The calendar lights up like the volleyball and the slip, its glow breathing, its date written on again, the pin in front.
    const t=(now-this.pullAt)/1000,Q=[[3328,605],[3580,592],[3594,915],[3350,928]],CB=[3315,580,290,360],cw=Math.round(CB[2]*v.s),ch=Math.round(CB[3]*v.s),ck=cw+'x'+ch+this.set;
    if(this.calCutKey!==ck){const c=Object.assign(document.createElement('canvas'),{width:cw,height:ch}),q=c.getContext('2d');q.beginPath();Q.forEach(([px,py],n)=>q[n?'lineTo':'moveTo']((px-CB[0])*v.s,(py-CB[1])*v.s));q.closePath();q.clip();q.drawImage(this.art,CB[0]*f,CB[1]*f,CB[2]*f,CB[3]*f,0,0,cw,ch);this.calCut=c;this.calCutKey=ck}
    x.save();x.shadowColor='rgba(255,246,214,1)';x.shadowBlur=44*v.s*IW/1920*k*(reduced?1:.8+.2*Math.sin(t*2.6));x.filter='brightness(1.12) saturate(.9)';for(let n=0;n<2;n++)x.drawImage(this.calCut,v.x+CB[0]*v.s,v.y+CB[1]*v.s,cw,ch);x.restore();this.paintCalendar(x,v);
    const out=reduced?.6:Math.min(1,t*4)*(.5-.5*Math.cos(t*Math.PI*2/1.3)),tip=[B[0]+23*K,B[1]+27*K],d=at({x:B[0],y:B[1],w:B[2],h:B[3]}),tx=v.x+tip[0]*v.s,ty=v.y+tip[1]*v.s,sc=1+.35*out;
    x.globalAlpha=.28*out;x.filter='brightness(0) blur('+(4*v.s*IW/1920)+'px)';x.drawImage(this.pinSprite.c,d[0]+out*16*v.s,d[1]+out*20*v.s,d[2],d[3]);x.filter='none';x.globalAlpha=1;
    x.translate(tx,ty);x.scale(sc,sc);x.translate(-tx,-ty);x.drawImage(this.pinSprite.c,d[0],d[1],d[2],d[3]);x.restore();if(!reduced)this.frame();return}
   if(r.key==='globe'){const G=g.LockerPull?.globe3d,M=this.globeMap,reduced=g.No2?.services?.save?.settings?.reduced;
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
   if(r.key==='backpack'&&this.bagPeekArt){const B={x:1332,y:2040,w:1189,h:388};x.beginPath();x.rect(...at({...B,h:B.h-6}));x.clip();x.drawImage(this.bagPeekArt,...at(B));x.restore();this.paintBag(x,v);this.paintCalendar(x,v);return}
   if(P&&img){x.drawImage(img,...at(P));if(r.key==='daily'){x.save();x.globalAlpha=1;x.translate(v.x+3478*v.s,v.y+800*v.s);x.rotate(.05);x.translate(-(v.x+3478*v.s),-(v.y+800*v.s));this.paintCalendar(x,v);x.restore()}
    const L=this.letters[this.set],fl=L.width/IW,box=q=>at({x:q[0],y:q[1],w:q[2],h:q[3]});
    for(const t of P.titles||[]){const[fx,fy,fw,fh]=t.from;x.save();x.beginPath();x.rect(...box(t.clip));x.clip();x.drawImage(L,fx*fl,fy*fl,fw*fl,fh*fl,...box(t.to));x.restore()}}
   x.restore()}
  lockerIdle(){return !!this.art&&!this.openBook&&!this.busy&&!document.hidden&&!g.No2?.intro?.active&&!$('desk-dialog')?.open}
  // One nudge: the lifted-notebook frame fades in rising, holds, and sinks back (about 1.6 s).
  // The bag's nudge stops as soon as the player chooses something else, so it never plays over another thing's animation.
  nudge(){this.nudged=true;this.nudgeT=0;const t0=performance.now(),l0=this.lift,run=t=>{const k=(t-t0)/1600;if(k>=1||!this.lockerIdle()||this.lift!==l0){this.nudgeT=-1;this.nudgeAt=performance.now();this.draw();return}
    this.nudgeT=k;this.draw();requestAnimationFrame(run)};requestAnimationFrame(run)}
  bagSeenNow(){if(this.bagSeen)return;this.bagSeen=true;try{localStorage.setItem('No2Arcade:bag-seen','1')}catch{}}
  prevSet(){this.bagSeenNow();this.set=(this.set+this.sets()-1)%this.sets();this.lift=null;this.key='';g.No2?.renderHub?.();this.draw();this.paintNote();return this.ids().at(-1)}
  // The luggage tag on the backpack says how many notebooks wait in it, written in her blue ballpoint; while nudging,
  // the lifted-notebook frame (rect in painting pixels) fades in as it rises.
  // The calendar page: today's month and day in her blue ballpoint (the month in the chosen language).
  paintCalendar(x,v){const d=new Date(),L=g.No2I18n?.lang||'en';let mon='';try{mon=d.toLocaleDateString({en:'en-US',fr:'fr-FR',es:'es-ES',de:'de-DE',it:'it-IT'}[L]||'en-US',{month:'short'}).replace('.','')}catch{}
    x.save();x.translate(v.x+3466*v.s,v.y+785*v.s);x.rotate(-.03);x.fillStyle='#1f3a6b';x.textAlign='center';x.textBaseline='middle';
    x.font=Math.round(44*v.s)+'px Hand, Schoolhand, sans-serif';x.fillText(mon,0,-62*v.s);x.font=Math.round(120*v.s)+'px Hand, Schoolhand, sans-serif';x.fillText(String(d.getDate()),0,22*v.s);x.restore()}
  paintBag(x,v){const k=this.nudgeT;if(k>=0&&this.bagPeekArt){const a=Math.sin(Math.min(1,k)*Math.PI),rise=(1-a)*30,P={x:1332,y:2040,w:1189,h:388};
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
const LOCKER_CSS=`body.locker-hub #page-tabs{position:fixed!important;inset:0!important;width:auto!important;height:auto!important;max-height:none!important;pointer-events:none;display:block!important}
body.locker-hub #page-tabs button{position:fixed!important;pointer-events:auto;background:none!important;background-image:none!important;clip-path:none!important;translate:none!important;transform:none!important;max-width:none!important;margin:0!important;padding:0!important;display:flex;align-items:center;justify-content:center;font-family:Hand,Schoolhand!important;font-size:clamp(16px,1.3vw,30px)!important;color:#fffaf0!important;text-shadow:0 1px 2px #1f2f4dcc,0 0 3px #1f2f4d99;text-align:center}
body.locker-hub #page-tabs button[aria-current=page]{text-decoration:underline;text-underline-offset:.2em}
body.locker-hub #page-tabs button:focus-visible{outline:2px solid #ffe7a8;outline-offset:2px}
body.locker-hub #book-chrome{justify-content:space-between}
body.locker-hub.tabs-hidden #page-tabs{visibility:hidden}
body.locker-hub #paper-page{background-image:none!important}
body.locker-hub #paper-page::before{display:none!important}
body.locker-hub #ink-binding{display:none!important}
body.locker-hub #paper-content{inset:0!important}
#nb-left{position:fixed;z-index:5;pointer-events:none}
.page-flip{position:fixed;inset:0;z-index:6;pointer-events:none;perspective:2400px}.page-flip>.flip-page{position:fixed}.flip-page{position:absolute;overflow:hidden;isolation:isolate}.flip-page>canvas{position:absolute;inset:0;width:100%;height:100%}.flip-strip{position:absolute;top:0;transform-style:preserve-3d}.flip-side{position:absolute;inset:0;overflow:hidden;backface-visibility:hidden}.flip-shade{position:absolute;inset:0;opacity:0;pointer-events:none;background:#1e1830}
body.locker-hub #opening-note{inset:45% 30% auto!important;background:none!important;box-shadow:none!important;transform:rotate(-2deg)!important;font-family:Hand,Schoolhand!important;font-size:clamp(20px,2vw,38px)!important;color:#1f3a6b!important}
/* Erasteroids' left page: her own game sprites (eraser rocks, the paper ship, saucers) as doodles. */
body[data-notebook=erasteroids][data-view=title] #paper-page::before{background-image:url(@@asset:assets/erasteroids/rock-a.webp@@),url(@@asset:assets/erasteroids/ship-thrust.webp@@),url(@@asset:assets/erasteroids/rock-c.webp@@)}
body[data-notebook=erasteroids][data-view=notes] #paper-page::before{background-image:url(@@asset:assets/erasteroids/ship.webp@@),url(@@asset:assets/erasteroids/rock-b.webp@@),url(@@asset:assets/erasteroids/saucer-big.webp@@)}
body[data-notebook=erasteroids][data-view=scores] #paper-page::before{background-image:url(@@asset:assets/erasteroids/saucer-small.webp@@),url(@@asset:assets/erasteroids/rock-d.webp@@),url(@@asset:assets/erasteroids/ship.webp@@)}
body[data-notebook=erasteroids][data-view=back] #paper-page::before{background-image:url(@@asset:assets/erasteroids/rock-c.webp@@),url(@@asset:assets/erasteroids/crumb-2.webp@@),url(@@asset:assets/erasteroids/rock-a.webp@@)}
/* Notebooks without a game yet: three of her doodles about that game on the left page (nb-doodles-1..6). */
body[data-notebook=gym-class-pong] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/gym-class-pong-a.webp@@),url(@@asset:assets/ui/doodles/gym-class-pong-b.webp@@),url(@@asset:assets/ui/doodles/gym-class-pong-c.webp@@)}
body[data-notebook=detention-breakout] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/detention-breakout-a.webp@@),url(@@asset:assets/ui/doodles/detention-breakout-b.webp@@),url(@@asset:assets/ui/doodles/detention-breakout-c.webp@@)}
body[data-notebook=space-substitutes] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/space-substitutes-a.webp@@),url(@@asset:assets/ui/doodles/space-substitutes-b.webp@@),url(@@asset:assets/ui/doodles/space-substitutes-c.webp@@)}
body[data-notebook=lunch-lander] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/lunch-lander-a.webp@@),url(@@asset:assets/ui/doodles/lunch-lander-b.webp@@),url(@@asset:assets/ui/doodles/lunch-lander-c.webp@@)}
body[data-notebook=spitball-command] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/spitball-command-a.webp@@),url(@@asset:assets/ui/doodles/spitball-command-b.webp@@),url(@@asset:assets/ui/doodles/spitball-command-c.webp@@)}
body[data-notebook=snack-man] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/snack-man-a.webp@@),url(@@asset:assets/ui/doodles/snack-man-b.webp@@),url(@@asset:assets/ui/doodles/snack-man-c.webp@@)}
body[data-notebook=recess-zone] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/recess-zone-a.webp@@),url(@@asset:assets/ui/doodles/recess-zone-b.webp@@),url(@@asset:assets/ui/doodles/recess-zone-c.webp@@)}
body[data-notebook=galgebra] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/galgebra-a.webp@@),url(@@asset:assets/ui/doodles/galgebra-b.webp@@),url(@@asset:assets/ui/doodles/galgebra-c.webp@@)}
body[data-notebook=centigrade] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/centigrade-a.webp@@),url(@@asset:assets/ui/doodles/centigrade-b.webp@@),url(@@asset:assets/ui/doodles/centigrade-c.webp@@)}
body[data-notebook=froggology] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/froggology-a.webp@@),url(@@asset:assets/ui/doodles/froggology-b.webp@@),url(@@asset:assets/ui/doodles/froggology-c.webp@@)}
body[data-notebook=quiz] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/quiz-a.webp@@),url(@@asset:assets/ui/doodles/quiz-b.webp@@),url(@@asset:assets/ui/doodles/quiz-c.webp@@)}
body[data-notebook=testpest] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/testpest-a.webp@@),url(@@asset:assets/ui/doodles/testpest-b.webp@@),url(@@asset:assets/ui/doodles/testpest-c.webp@@)}
body[data-notebook=home-ec-scramble] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/home-ec-scramble-a.webp@@),url(@@asset:assets/ui/doodles/home-ec-scramble-b.webp@@),url(@@asset:assets/ui/doodles/home-ec-scramble-c.webp@@)}
body[data-notebook=dunce-kong] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/dunce-kong-a.webp@@),url(@@asset:assets/ui/doodles/dunce-kong-b.webp@@),url(@@asset:assets/ui/doodles/dunce-kong-c.webp@@)}
body[data-notebook=dig-doug] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/dig-doug-a.webp@@),url(@@asset:assets/ui/doodles/dig-doug-b.webp@@),url(@@asset:assets/ui/doodles/dig-doug-c.webp@@)}
body[data-notebook=q-nerd] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/q-nerd-a.webp@@),url(@@asset:assets/ui/doodles/q-nerd-b.webp@@),url(@@asset:assets/ui/doodles/q-nerd-c.webp@@)}
body[data-notebook=jock-joust] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/jock-joust-a.webp@@),url(@@asset:assets/ui/doodles/jock-joust-b.webp@@),url(@@asset:assets/ui/doodles/jock-joust-c.webp@@)}
body[data-notebook=class-of-2084] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/class-of-2084-a.webp@@),url(@@asset:assets/ui/doodles/class-of-2084-b.webp@@),url(@@asset:assets/ui/doodles/class-of-2084-c.webp@@)}
body[data-notebook=mystery-meat-time] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/mystery-meat-time-a.webp@@),url(@@asset:assets/ui/doodles/mystery-meat-time-b.webp@@),url(@@asset:assets/ui/doodles/mystery-meat-time-c.webp@@)}
body[data-notebook=hall-patrol] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/hall-patrol-a.webp@@),url(@@asset:assets/ui/doodles/hall-patrol-b.webp@@),url(@@asset:assets/ui/doodles/hall-patrol-c.webp@@)}
body[data-notebook=term-paperboy] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/term-paperboy-a.webp@@),url(@@asset:assets/ui/doodles/term-paperboy-b.webp@@),url(@@asset:assets/ui/doodles/term-paperboy-c.webp@@)}
body[data-notebook=locker-gauntlet] #paper-page::before{background-image:url(@@asset:assets/ui/doodles/locker-gauntlet-a.webp@@),url(@@asset:assets/ui/doodles/locker-gauntlet-b.webp@@),url(@@asset:assets/ui/doodles/locker-gauntlet-c.webp@@)}
/* Comic controls on the dark reading background: no cream pills; the key glyph keeps its own width, the word sits beside it. */
body.locker-hub .device-glyph{width:auto!important;min-width:0!important;flex:none}
body.locker-hub :is(.motion-skip,.motion-controls button) .device-glyph{mix-blend-mode:normal!important}
body.locker-hub :is(.motion-skip,.motion-controls button){background:#2b2633d9!important;border:0!important;box-shadow:0 2px 8px #0006!important;border-radius:10px!important;display:inline-flex!important;align-items:center;gap:.45em;color:#f3ecdc!important;font-family:Hand,Schoolhand,sans-serif!important;text-shadow:0 1px 2px #000a;padding:.25em .6em!important} body.locker-hub :is(.motion-skip,.motion-controls,.motion-controls button)[hidden]{display:none!important}
/* Dialogs (owner 2026-10-24 redesign): a sheet torn out of the notebook, taped, over the dimmed locker; ballpoint controls. */
body.locker-hub #desk-dialog:not(.backpack-dialog){border-image:none!important;border:0!important;background:url(@@asset:assets/ui/dlg-sheet.webp@@) center/100% 100% no-repeat!important;padding:6.5% calc(min(84vw,1240px) * .0775) 5% calc(min(84vw,1240px) * .19)!important;width:min(84vw,1240px)!important;max-width:none!important;max-height:94vh!important;overflow:visible!important;font-size:clamp(16px,1.35vw,26px)!important;filter:drop-shadow(4px 10px 14px #1a142888)}
body.locker-hub #desk-dialog:not(.backpack-dialog)::backdrop{background:#1a162840}
body.locker-hub #desk-dialog #dialog-kicker{display:none}
body.locker-hub #desk-dialog #dialog-title{font-family:Marker,SchoolMarker!important;font-size:1.55em!important;color:#243543!important;margin:0 0 .4em!important;white-space:nowrap}
/* The words start right of the sheet's red margin (owner 2026-10-31: the margin is at 15.5 to 16.6% of the sheet, the words start at 19%); the title still centres on the paper: its box reaches as far left as the right padding. */
#desk-dialog:not(.backpack-dialog):not([data-screen=pause]) #dialog-title{margin-left:calc(min(84vw,1240px) * -.1125)!important}
body.locker-hub #desk-dialog #dialog-title::before{width:1.4em;height:1.4em}
body.locker-hub #desk-dialog #dialog-close{background:url(@@asset:assets/ui/ink-underline.webp@@) 100% 100%/45% 30% no-repeat!important;padding:.1em .3em .35em!important;font-family:Hand,Schoolhand!important;color:#1f3a6b!important}
body.locker-hub #desk-dialog button:not(#dialog-close){border-image:none!important;border:0!important;background:none!important;font-family:Hand,Schoolhand!important;color:#1f3a6b!important;padding:.3em .6em!important;text-align:left}
body.locker-hub #desk-dialog .options{display:grid!important;grid-template-columns:1fr 1fr!important;gap:.1em 1.5em!important;font-size:.92em}
body.locker-hub #desk-dialog .options button:not(#dialog-close)[aria-pressed]{white-space:nowrap}
body.locker-hub #desk-dialog .options button:not(#dialog-close){min-height:0!important;height:auto!important;padding:.25em .2em .25em 2.1em!important;background:url(@@asset:assets/ui/ink-box-empty.webp@@) left center/1.5em auto no-repeat!important}
body.locker-hub #desk-dialog .options button:not(#dialog-close)[aria-pressed=true]{background-image:url(@@asset:assets/ui/ink-box-checked.webp@@)!important}
body.locker-hub #desk-dialog .options button:not(#dialog-close):not([aria-pressed]){background-image:url(@@asset:assets/ui/ink-arrow.webp@@)!important;background-size:1.4em auto!important}
body.locker-hub #desk-dialog .actions button:not(#dialog-close){background:url(@@asset:assets/ui/ink-underline.webp@@) center bottom/95% 34% no-repeat!important}
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
/* The main page action is written on a band of white correction tape, like the tags and keys (owner 2026-10-26). */
body.locker-hub #paper-content .page-actions button.primary{background:url(@@asset:assets/ui/tape-a.webp@@) center/100% 100% no-repeat!important;padding:.45em 1.3em .55em!important;filter:drop-shadow(2px 3px 4px #1e18304a)}
body.locker-hub #paper-content .page-actions button:not(.primary){background:url(@@asset:assets/ui/ink-underline.webp@@) center bottom/95% 38% no-repeat!important}
body.locker-hub #paper-content .page-actions button:is(:hover,:focus-visible){translate:0 -2px;outline:0;filter:drop-shadow(0 0 6px #ffe7a8)}
body.locker-hub #paper-content .page-actions button:is(:hover,:focus-visible)::before{content:'';position:absolute;left:-1.6em;top:50%;width:1.3em;height:.6em;translate:0 -50%;background:url(@@asset:assets/ui/ink-arrow.webp@@) center/contain no-repeat}
#nb-left img{position:absolute;mix-blend-mode:multiply}
/* ===== UI type rules (owner 2026-10-24). Four sizes, scaled from 1080p; nothing smaller than meta. =====
   title  52 Permanent Marker  one per screen (dialog title, notebook name)
   body   30 Patrick Hand      running text, lists, cheat sheet lines
   control 26 Patrick Hand     every button, tab, close/back, prompt
   meta   22 Patrick Hand      page number, version, status */
:root{--u:min(calc(100vw / 1920),calc(100vh / 1080));--t-title:max(26px,calc(52 * var(--u)));--t-head:max(56px,calc(118 * var(--u)));--t-body:max(17px,calc(30 * var(--u)));--t-control:max(16px,calc(26 * var(--u)));--t-meta:max(14px,calc(22 * var(--u)));--ink:#243543;--pen:#1f3a6b}
body.locker-hub #paper-content,body.locker-hub #paper-content :is(p,li,span,b,i,strong,div){font-family:Hand,Schoolhand,sans-serif!important;font-size:var(--t-body)!important;line-height:1.45!important;color:var(--ink)}
body.locker-hub #nb-left .nb-name{font-size:var(--t-title)!important}
#nb-left .nb-name{top:3%!important;left:6%!important;right:6%!important;height:20%;font-size:0!important;color:transparent!important;background:center/contain no-repeat;transform:rotate(-1.5deg)!important}
body:is([data-notebook=gym-class-pong],[data-notebook=quiz]) #nb-left .nb-name{top:7%!important;height:18%}
/* Centred on the paper you see (owner 2026-10-30): the left page's visible paper runs past the box on the outer side, so the
   title sits 5.6% of the box to the left of the box's middle. */
body.locker-hub #nb-left .nb-name{left:.4%!important;right:11.6%!important}
/* Title page: her drawn preview of each game's screen (owner 2026-10-25, previews-a..f). */
/* Each preview is its own taped-on sheet (owner 2026-10-25, preview-taped): a little tilted, a soft shadow under the paper. */
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
/* Each notebook's title, hand lettered by her in the style of its game (owner 2026-10-25, titles-pilot and titles-a..e). */
body[data-notebook=centigrade] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/centigrade.webp@@)}
body[data-notebook=class-of-2084] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/class-of-2084.webp@@)}
body[data-notebook=detention-breakout] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/detention-breakout.webp@@)}
body[data-notebook=dig-doug] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/dig-doug.webp@@)}
body[data-notebook=dunce-kong] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/dunce-kong.webp@@)}
body[data-notebook=erasteroids] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/erasteroids.webp@@)}
body[data-notebook=froggology] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/froggology.webp@@)}
body[data-notebook=galgebra] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/galgebra.webp@@)}
body[data-notebook=gym-class-pong] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/gym-class-pong.webp@@)}
body[data-notebook=hall-patrol] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/hall-patrol.webp@@)}
body[data-notebook=home-ec-scramble] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/home-ec-scramble.webp@@)}
body[data-notebook=jock-joust] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/jock-joust.webp@@)}
body[data-notebook=locker-gauntlet] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/locker-gauntlet.webp@@)}
body[data-notebook=lunch-lander] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/lunch-lander.webp@@)}
body[data-notebook=mystery-meat-time] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/mystery-meat-time.webp@@)}
body[data-notebook=q-nerd] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/q-nerd.webp@@)}
body[data-notebook=quiz] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/quiz.webp@@)}
body[data-notebook=recess-zone] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/recess-zone.webp@@)}
body[data-notebook=scribble-defender] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/scribble-defender.webp@@)}
body[data-notebook=snack-man] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/snack-man.webp@@)}
body[data-notebook=space-substitutes] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/space-substitutes.webp@@)}
body[data-notebook=spitball-command] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/spitball-command.webp@@)}
body[data-notebook=term-paperboy] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/term-paperboy.webp@@)}
body[data-notebook=testpest] #nb-left .nb-name{background-image:url(@@asset:assets/ui/titles/testpest.webp@@)}

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
/* Keycaps never touch the row above or below (owner 2026-10-25, again 2026-10-26): every key and button the same height, a clear gap between rows. */
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
/* Hand-lettered headings (owner 2026-10-26: titles drawn, never a font); the words stay in the page for screen readers. */
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
/* The language map (owner 2026-10-30): a pull-down classroom map with a pin per language in its colour, and the same four as a
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


body:has(#book-view:not(.hidden)) #now-playing{left:auto;right:calc(28 * var(--u));transform:translateX(calc(100% + 60px)) rotate(2deg)}
body:has(#book-view:not(.hidden)) #now-playing.show{transform:translateX(0) rotate(2deg)}
#now-playing::before{content:'';position:absolute;top:calc(-10 * var(--u));left:38%;width:calc(90 * var(--u));height:calc(22 * var(--u));background:rgba(236,226,196,.75);transform:rotate(3deg);box-shadow:0 1px 2px rgba(0,0,0,.08)}
#now-playing img{width:calc(150 * var(--u));min-width:90px;height:auto;filter:drop-shadow(0 2px 2px rgba(40,30,20,.3));animation:np-wobble 2.4s ease-in-out infinite}
#now-playing .np-words{display:flex;flex-direction:column;line-height:1.15}
#now-playing .np-kicker,#now-playing .np-tape{font-size:var(--t-meta);opacity:.75}
#now-playing .np-song{font-size:var(--t-body);color:#22355a}
@keyframes np-wobble{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1.5deg)}}
@media (prefers-reduced-motion:reduce){#now-playing{transition:opacity .3s;transform:rotate(-2deg);opacity:0}#now-playing.show{opacity:1;transform:rotate(-2deg)}#now-playing img{animation:none}}
/* Mixtapes page (owner 2026-10-30, second layout): left, the song playing in large type with the whole tape's song list and the
   Walkman under it; right, the five tapes down the page, large, each with its maker's photo, title and note. */
body.locker-hub #desk-dialog #dialog-content .walkman-deck{display:flex;flex-direction:row;align-items:flex-start;gap:calc(34 * var(--u));margin:0;padding:0}
body.locker-hub #desk-dialog #dialog-content .walkman-deck .walkman-player{flex:0 0 calc(270 * var(--u));display:flex;flex-direction:column;align-items:stretch;gap:.8em}
body.locker-hub #desk-dialog #dialog-content .tape-now-block p{margin:0}
body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-kicker{color:#c0392b;opacity:1}
body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-song{font-size:var(--t-body)!important;color:#1b3591;line-height:1.1;margin:.1em 0}
body.locker-hub #desk-dialog #dialog-content .tape-now-block ol.tape-songs{margin:.5em 0 0 1.5em;padding:0}
body.locker-hub #desk-dialog #dialog-content .tape-now-block ol.tape-songs li{font-size:var(--t-control)!important;margin:.1em 0;opacity:.6}
body.locker-hub #desk-dialog #dialog-content .tape-now-block ol.tape-songs li.playing{opacity:1}
body.locker-hub #desk-dialog #dialog-content .walkman-unit{display:flex;align-items:flex-end;gap:.8em}
body.locker-hub #desk-dialog #dialog-content .walkman-unit img.walkman-body{width:max(96px,calc(170 * var(--u)));height:auto;filter:drop-shadow(0 4px 4px rgba(40,30,20,.3));transform:rotate(-2deg)}
body.locker-hub #desk-dialog #dialog-content .walkman-unit .walkman-keys{flex-direction:column;gap:.35em}
body.locker-hub #desk-dialog #dialog-content .walkman-unit button.walkman-key{width:max(36px,calc(62 * var(--u)))}
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
@media (max-height:560px){body.locker-hub #desk-dialog #dialog-content ol.tape-list .tape-note{display:none}body.locker-hub #desk-dialog #dialog-content ol.tape-list{gap:0}body.locker-hub #desk-dialog #dialog-content ol.tape-list button.tape{padding:0 .4em}body.locker-hub #desk-dialog #dialog-content ol.tape-list .tape-art{flex-basis:4.6em;padding-left:1.4em}body.locker-hub #desk-dialog #dialog-content ol.tape-list img.tape-photo{width:1.6em}body.locker-hub #desk-dialog #dialog-content .walkman-deck .walkman-player{flex-basis:10em}body.locker-hub #desk-dialog #dialog-content .tape-now-block ol.tape-songs{display:none}body.locker-hub #desk-dialog #dialog-content .walkman-unit img.walkman-body{width:4.2em}}
/* Touch play (2026-10-30, player report): while a game is on the page nothing scrolls, bounces or zooms, so a finger that slides
   off the play area never pulls the browser bar in or out (which resized and seemed to zoom the page). */
html:has(body[data-view=play]),body[data-view=play]{overflow:hidden;overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
body[data-view=play] #book-view,body[data-view=play] #game-mount{touch-action:none}
/* Action ruler (owner 2026-10-30): a wooden school ruler along the bottom of every screen with the actions available now. */
#action-ruler{position:fixed;left:50%;bottom:calc(max(6px,calc(10 * var(--u))) * var(--rh,1));transform:translateX(-50%);z-index:60;display:none;align-items:center;justify-content:center;overflow:hidden;gap:calc(26 * var(--u) * var(--rk,1));max-width:96vw;box-sizing:border-box;height:calc(max(48px,calc(72 * var(--u))) * var(--rh,1));padding:calc(20 * var(--u) * var(--rh,1)) calc(48 * var(--u)) 0;border-style:solid;border-width:0 calc(40 * var(--u));border-image:url(@@asset:assets/ui/ruler.webp@@) 0 60 fill / 0 calc(40 * var(--u)) stretch;filter:drop-shadow(0 4px 6px rgba(30,20,10,.35));font-family:Hand,Schoolhand,sans-serif;color:#22355a;white-space:nowrap}
body.has-ruler #action-ruler{display:flex}
#action-ruler{pointer-events:none}#action-ruler .ruler-slot{pointer-events:auto;display:inline-flex;align-items:center;gap:.3em;font-size:calc(var(--t-control) * var(--rk,1))!important;background:none;border:0;padding:.1em .35em;border-radius:8px;color:inherit;font-family:inherit;cursor:pointer;line-height:1}
#action-ruler .ruler-slot.info{cursor:default;opacity:.85;pointer-events:none}
/* A sheet keeps the ruler's band free at its foot, so nothing on it sits under the ruler. */
body.has-ruler #desk-dialog[open] #dialog-content{padding-bottom:max(64px,calc(96 * var(--u)))!important}
#action-ruler button.ruler-slot:is(:hover,:focus-visible){background:rgba(255,231,168,.6)}
#action-ruler .ruler-slot+.ruler-slot{border-left:1.5px solid rgba(60,40,20,.35);padding-left:calc(26 * var(--u));border-radius:0}
/* The ruler holds back and the hints, so the old corner slips and the hint line go. */
body.has-ruler #input-prompts,body.has-ruler #desk-dialog #dialog-close,body.has-ruler #close-book{display:none!important}
@media (max-width:700px){#action-ruler{gap:.5em;padding-left:1em;padding-right:1em}#action-ruler .ruler-slot.info{display:none}#action-ruler .ruler-slot+.ruler-slot{padding-left:.6em}}
/* Mixtapes (owner 2026-10-29): five painted tapes, three over two; the one in the Walkman sits a little higher with a pen ring. */
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
body.locker-hub #desk-dialog .walkman-side{flex:1;min-width:0;padding-top:.6em}
body.locker-hub #desk-dialog .walkman-side p.tape-now{margin:0 0 .1em}
body.locker-hub #desk-dialog .walkman-side p.tape-count{margin:0 0 .5em}
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
/* Detention slip form: the select and the note on the ruled sheet, in her hand. */
body.locker-hub #desk-dialog[data-screen=report] #dialog-content :is(select,textarea){display:block;width:100%;box-sizing:border-box;margin:0 0 .5em;font-family:Hand,Schoolhand,sans-serif;font-size:var(--t-body);color:var(--ink);background:#fffdf6cc;border:1px solid #1f3a6b55;border-radius:3px;padding:.2em .4em}
body.locker-hub #desk-dialog[data-screen=report] #dialog-content textarea{resize:none;line-height:1.35}
body.locker-hub #desk-dialog .slip-keys{display:flex;flex-direction:column;align-items:center;gap:.15em;margin:.2em 0 .4em}body.locker-hub #desk-dialog .slip-row{display:flex;gap:.2em}
body.locker-hub #desk-dialog #dialog-content button.slip-key{min-width:1.9em;padding:.05em .3em!important;text-align:center;font-size:var(--t-meta)!important;background:url(@@asset:assets/ui/key.webp@@) center/100% 100% no-repeat!important;color:#1f2433!important}body.locker-hub #desk-dialog #dialog-content button.slip-key.wide{min-width:7em}
body.locker-hub #desk-dialog #dialog-content button.slip-key:is(:focus-visible,.pad-focus){outline:2px solid #1f3a6b;outline-offset:2px;filter:drop-shadow(0 0 5px #ffe7a8)}
body.locker-hub #desk-dialog[data-screen=report] #dialog-content :is(select,textarea):focus-visible{outline:2px solid #1f3a6b;outline-offset:2px}
body.locker-hub #desk-dialog #dialog-title .heading-calculator{aspect-ratio:5.537;background-image:url(@@asset:assets/ui/headings/points.webp@@)}
body.locker-hub #desk-dialog #dialog-title .heading-achievements{aspect-ratio:5.925;background-image:url(@@asset:assets/ui/headings/victories.webp@@)}
body.locker-hub #desk-dialog #dialog-title .heading-scores{aspect-ratio:5.982;background-image:url(@@asset:assets/ui/headings/scores.webp@@)}
body.locker-hub #desk-dialog #dialog-title .heading-eraser{aspect-ratio:6.694;background-image:url(@@asset:assets/ui/headings/eraser.webp@@)}
body.locker-hub #desk-dialog #dialog-title .heading-confirm{aspect-ratio:9.151;background-image:url(@@asset:assets/ui/headings/confirm.webp@@)}
body.locker-hub #desk-dialog #dialog-title .heading-swap{aspect-ratio:6.412;background-image:url(@@asset:assets/ui/headings/swap.webp@@)}
body.locker-hub #desk-dialog #dialog-title .heading-pause{aspect-ratio:2.585;background-image:url(@@asset:assets/ui/headings/pause.webp@@)}
/* who's who (owner 2026-10-24): each character page is a classic Polaroid with the full name handwritten under the photo (Nano Banana lettering, not a font), no notebook sheet */
body.locker-hub #desk-dialog[data-screen=cast]{background:none!important;filter:none!important;padding:0!important;width:auto!important;overflow:visible!important}
body.locker-hub #desk-dialog[data-screen=cast]::backdrop{background:#120f1cb3}
body.locker-hub #desk-dialog[data-screen=cast] #dialog-title{display:none!important}
body.locker-hub #desk-dialog[data-screen=cast] #dialog-close{position:fixed!important;left:calc(48 * var(--u));top:calc(40 * var(--u));background:url(@@asset:assets/ui/tape-b.webp@@) center/100% 100% no-repeat!important;padding:.4em 1em .5em!important;transform:rotate(-1.2deg);filter:drop-shadow(2px 4px 5px #0006)}
body.locker-hub #desk-dialog .polaroid{--s:min(56vh,calc(600 * var(--u)));margin:0 auto;width:var(--s);box-sizing:content-box;background:linear-gradient(160deg,#fdfcf7,#f1eee4);padding:calc(var(--s) * 6 / 79) calc(var(--s) * 4.5 / 79) 0;transform:rotate(var(--tilt,-1deg));box-shadow:0 2px 3px #0003,4px 14px 26px #0008}
/* classic Polaroid: 88 x 107 mm card, 79 mm square photo, 6 mm top, 4.5 mm sides, 22 mm bottom where the name is written */
body.locker-hub #desk-dialog .cast-page{display:block;width:var(--s);height:var(--s);object-fit:cover;object-position:50% 10%;outline:1px solid #2a20180f;cursor:pointer;filter:saturate(.92) contrast(1.02)}
body.locker-hub #desk-dialog .polaroid-stack{--s:min(56vh,calc(600 * var(--u)));position:relative;width:max-content;margin:0 auto}
body.locker-hub #desk-dialog .polaroid-unders{position:absolute;inset:0;pointer-events:none}
body.locker-hub #desk-dialog .polaroid-under{position:absolute;inset:0;background:linear-gradient(160deg,#f8f6ee,#e9e4d6);box-shadow:0 2px 3px #0003,3px 10px 18px #0006;transform:translate(calc(var(--k) * var(--s) * .018),calc(var(--k) * var(--s) * .012)) rotate(var(--r))}
body.locker-hub #desk-dialog .polaroid-stack>.polaroid{position:relative}
body.locker-hub #desk-dialog .polaroid-name{box-sizing:border-box;height:calc(var(--s) * 22 / 79);display:flex;align-items:center;justify-content:center}
body.locker-hub #desk-dialog .polaroid-written{height:auto;max-height:70%;transform:rotate(-1.5deg)}
body.locker-hub #desk-dialog[data-screen=cast] .cast-nav{width:max-content;margin:calc(28 * var(--u)) auto 0;padding:.35em 1.2em .45em;background:url(@@asset:assets/ui/tape-b.webp@@) center/100% 100% no-repeat;filter:drop-shadow(2px 4px 5px #0006)}
body.locker-hub #desk-dialog .cast-nav{display:flex;align-items:center;justify-content:center;gap:1.4em;margin-top:.6em;font-size:var(--t-control)}
body.locker-hub #desk-dialog .cast-count{font-size:var(--t-meta);font-family:Hand,Schoolhand,sans-serif}
body.locker-hub #desk-dialog .calculator-total{font-family:Hand,Schoolhand,sans-serif!important;font-size:var(--t-title)!important}
/* locker label: the selected thing and how to open it, written in ink on the painted index card on the door; Esc title is on its own slip, top left */
body.locker-hub #locker-note{box-sizing:border-box;padding:0!important;background:none!important;border:0!important;box-shadow:none!important;filter:none!important;transform:none!important;font-size:var(--t-control)!important;gap:.25em;flex-direction:column;align-items:center!important;justify-content:center!important;color:#1d2740!important}
body.locker-hub #locker-note .note-more{font-family:Hand,Schoolhand,sans-serif;font-size:var(--t-meta);line-height:1.1;text-align:center;opacity:.85;margin-top:.15em}
body.locker-hub #locker-note .note-name{font-family:Hand,Schoolhand,sans-serif;font-size:var(--t-body);line-height:1.1;text-align:center;max-width:100%}
body.locker-hub #locker-note .note-name.long{font-size:var(--t-control);line-height:1.05;text-wrap:balance}
body.locker-hub #locker-note img{height:1.25em!important}

body.locker-hub #book-chrome{align-items:center!important;height:auto!important}
body.locker-hub #book-chrome :is(#close-book,#book-breadcrumb){background:url(@@asset:assets/ui/tape-a.webp@@) center/100% 100% no-repeat!important;color:#152e43!important;border-radius:0!important;padding:.35em 1em .45em!important;box-shadow:none!important;text-shadow:none!important;filter:drop-shadow(2px 4px 5px #1e18305c)}
/* Buttons are bands of white correction tape she laid down to write on (owner 2026-10-25). */
body.locker-hub #book-chrome #book-breadcrumb{background-image:url(@@asset:assets/ui/tape-d.webp@@)!important}
body.locker-hub #close-book{transform:rotate(-1.2deg)}body.locker-hub:has(#desk-dialog[open]) #close-book{visibility:hidden}body.locker-hub #book-breadcrumb{transform:rotate(.8deg)}
body.locker-hub #close-book .device-glyph{mix-blend-mode:normal!important}

/* Lettered page headings read as titles (owner 2026-10-30): large, centred, shrunk only when the page is too narrow. */
body.locker-hub #desk-dialog #dialog-title span[class^=heading-]{max-width:100%!important;background-position:center!important}
body.locker-hub #desk-dialog:focus,body.locker-hub #desk-dialog:focus-visible{outline:none}

/* The comic's keys sit on the same ruler as every other screen (owner 2026-10-30): previous, next and hold to skip. */
body.locker-hub .motion-controls{position:fixed!important;left:50%!important;right:auto!important;top:auto!important;bottom:max(6px,calc(10 * var(--u)))!important;transform:translateX(-50%);z-index:60;display:flex!important;align-items:center;justify-content:center;gap:0!important;max-width:96vw;box-sizing:border-box;height:max(48px,calc(72 * var(--u)));padding:calc(20 * var(--u)) calc(48 * var(--u)) 0;border-style:solid;border-width:0 calc(40 * var(--u));border-image:url(@@asset:assets/ui/ruler.webp@@) 0 60 fill / 0 calc(40 * var(--u)) stretch;filter:drop-shadow(0 4px 6px rgba(30,20,10,.35));white-space:nowrap}
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

/* The online score browser's arrows, count and whole-board link live on the ruler (owner 2026-10-30). */
body.has-ruler #desk-dialog :is(.cast-nav,.lb-whole){display:none!important}
body.has-ruler #desk-dialog #dialog-content [data-pad=Y]{display:none!important}

/* What's new (owner 2026-10-30): one entry per release, newest first. */
body.locker-hub #desk-dialog #dialog-content ol.news{list-style:none;margin:0;padding:0 0 0 2.4em;max-width:46em}
body.locker-hub #desk-dialog #dialog-content ol.news li{margin:0 0 .55em;line-height:1.3}
body.locker-hub #desk-dialog #dialog-content ol.news b{display:block;color:#b03a2e;font-weight:normal;font-size:var(--t-meta)}

/* Title icons match the lettered titles (owner 2026-10-30). */
body.locker-hub #desk-dialog #dialog-title::before{width:calc(var(--t-head) * .95)!important;height:calc(var(--t-head) * .95)!important;margin-right:.15em}
/* Settings groups (owner 2026-10-30). */
body.locker-hub #desk-dialog #dialog-content p.settings-group{margin:.6em 0 .1em!important;color:#b03a2e;font-size:var(--t-control)!important;border-bottom:1.5px solid rgba(176,58,46,.35);padding-bottom:.05em}
body.locker-hub #desk-dialog #dialog-content p.settings-group:first-of-type{margin-top:0!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .options{gap:0 1.4em!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .options button{padding-top:.12em!important;padding-bottom:.12em!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .volume-row{padding:.1em .2em!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .actions{margin-top:.5em!important}

/* Set up my controller (owner 2026-10-30). */
body.locker-hub #desk-dialog #dialog-content .pad-ask{text-align:center;margin:.6em 0 .2em}
body.locker-hub #desk-dialog #dialog-content .pad-glyph{display:flex;justify-content:center;font-size:calc(var(--t-title) * 1.6)!important;margin:.2em 0}
body.locker-hub #desk-dialog #dialog-content .pad-count{text-align:center}

/* The detention slip sits in front of the sneaker's larger area (owner 2026-10-30: the whole sneaker opens the gym report). */
#desk-report{z-index:3!important}

/* Mixtapes (owner 2026-10-30): the Walkman with the chosen tape is the title icon; the songs and keys fill the player side. */
body.locker-hub #desk-dialog[data-screen=walkman] #dialog-title::before{display:block!important;background-image:var(--walkman-icon)!important;width:calc(var(--t-head) * .9)!important;height:calc(var(--t-head) * 1.35)!important;transform:rotate(-4deg);filter:drop-shadow(0 3px 3px rgba(40,30,20,.3));margin-top:calc(var(--t-head) * -.25)}

body.locker-hub #desk-dialog #dialog-content .walkman-deck .walkman-player{flex:0 0 calc(250 * var(--u))!important;align-items:stretch!important;gap:1em!important}
body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-song{font-size:calc(var(--t-body) * 1.3)!important}
body.locker-hub #desk-dialog #dialog-content .tape-now-block ol.tape-songs li{font-size:var(--t-body)!important;margin:.25em 0!important}
body.locker-hub #desk-dialog #dialog-content .walkman-player > .walkman-keys{display:flex!important;flex-direction:row!important;justify-content:flex-start;gap:calc(18 * var(--u))!important;margin-left:1.2em}
body.locker-hub #desk-dialog #dialog-content .walkman-player > .walkman-keys button.walkman-key{width:calc(78 * var(--u))!important;display:flex;flex-direction:column;align-items:center;gap:.15em}
body.locker-hub #desk-dialog #dialog-content .walkman-key-word{font-size:var(--t-meta)!important;color:#1b3591;font-family:Hand,Schoolhand,sans-serif;white-space:nowrap}
body.locker-hub #desk-dialog #dialog-content ol.tape-list:has(>li:nth-child(6)) .tape-note{font-size:calc(var(--t-meta) * .92)!important}
body.locker-hub #desk-dialog #dialog-content ol.tape-list:has(>li:nth-child(6)) button.tape{padding-top:.05em!important;padding-bottom:.05em!important}

/* Tape rows: cassette, its note, then its maker's photo on the right (owner 2026-10-30). The Walkman keys are on the ruler. */
body.locker-hub #desk-dialog #dialog-content ol.tape-list .tape-art{padding-left:0!important;flex-basis:max(110px,calc(190 * var(--u)))!important}
body.locker-hub #desk-dialog #dialog-content ol.tape-list img.tape-photo{position:static!important;margin:0!important;flex:0 0 auto;width:max(48px,calc(84 * var(--u)))!important;transform:rotate(4deg)!important}
body.locker-hub #desk-dialog #dialog-content .walkman-key-word{display:none!important}

/* A lean left side (owner 2026-10-30): one line of what is playing, the song large, the tape's songs numbered below. */
body.locker-hub #desk-dialog #dialog-content .walkman-player > .walkman-keys[hidden]{display:none!important}
body.locker-hub #desk-dialog #dialog-content .walkman-deck .walkman-player{flex-basis:calc(270 * var(--u))!important;padding-top:.4em}
body.locker-hub #desk-dialog #dialog-content .tape-now-block .tape-song{font-size:calc(var(--t-title) * .9)!important;font-family:Hand,Schoolhand,sans-serif;line-height:1.05!important;margin:.15em 0 .5em!important}
body.locker-hub #desk-dialog #dialog-content .tape-now-block ol.tape-songs{margin:.2em 0 0 1.6em!important;border-top:1.5px solid rgba(27,53,145,.25);padding-top:.5em!important}
body.locker-hub #desk-dialog #dialog-content .tape-now-block ol.tape-songs li{font-size:var(--t-control)!important;margin:.35em 0!important}
body.locker-hub #desk-dialog #dialog-content ol.tape-list .tape-art{flex-basis:max(96px,calc(160 * var(--u)))!important}
body.locker-hub #desk-dialog #dialog-content ol.tape-list:has(>li:nth-child(6)) .tape-art{flex-basis:max(90px,calc(146 * var(--u)))!important}
body.locker-hub #desk-dialog #dialog-content ol.tape-list img.tape-photo{width:max(44px,calc(74 * var(--u)))!important}
/* tapes fit above the ruler (player report 2026-10-30): tight rows, and the list scrolls on short screens */
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
/* the song list on the playing tape's case card (owner 2026-10-30) */
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

/* Settings fit one sheet in every language (owner 2026-10-30): a capped title (1.15, owner 2026-10-31: the letters of the one-line titles match the other pages in English, Spanish and Italian), tighter rows, the controller line small. */
html body.locker-hub #desk-dialog[data-screen=settings] #dialog-title span.heading-settings.heading-settings.heading-settings.heading-settings{max-height:calc(var(--t-head) * 1.15)!important;max-width:100%!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-title{margin-bottom:.15em!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content h3.settings-group{margin:.3em 0 0!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .options button{padding-top:.06em!important;padding-bottom:.06em!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .actions{margin:.35em 0 0!important}
/* Its four links stay on one row in every language (owner 2026-10-31: a second row was pushed under the ruler). */
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .actions{display:flex!important;flex-wrap:nowrap!important;justify-content:center!important;gap:.4em!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .actions button{white-space:nowrap!important;padding-left:.35em!important;padding-right:.35em!important}
body.locker-hub #desk-dialog[data-screen=settings] #dialog-content .controller-status{margin:.2em 0 0!important;font-size:var(--t-meta)!important}
`;
g.No2Locker={LockerRenderer,SPINES,PROPS,SPREAD,PLAY};
})(globalThis);
