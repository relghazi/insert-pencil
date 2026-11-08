'use strict';
// R3Z Games studio card (the pencil), ported from Jimothy: Rain City Rumble's ui/splash.gd and
// timed to its studio sting (assets/audio/sfx/studio-sting.m4a): two sparks race round the gold frame from the bottom centre
// and meet at the top (0.45-1.35); the frame flares and a square shockwave rolls out; R3Z slams in with a colour split, a
// flash, a shake and debris (1.55); her yellow No. 2 pencil (the approved Quiz pencil, assets/qix/pencil.webp, in place of
// Jimothy) hops onto the frame, peeks at the logo, dives down and writes GAMES, each letter appearing as its tip passes over
// it on the sting's ticks (2.75, one every 0.09 s); a sparkle (3.25); it hops off; out. With reduced motion a still card for
// 1.5 s (no shake, no flash). MotionComic plays it once per launch before the title (phase 'sting') and routes every key,
// click, tap and pad button here; while the browser still keeps sound locked it first waits for one with a small hint.
(function(g){
const SIZE=[200,176],FR={x:28.75,y:1.25,w:142.5,h:147.25},WORD=[[28.75,44.25],[59.25,77],[92.5,109.75],[127.25,141],[156.75,171.25]],WORD_Y=160;
const TRACE=[.45,1.35],SLAM=1.55,TICKS=2.75,TICK_STEP=.09,GLINT=3.25,END=4.6,STILL=1.5,SKIP_AFTER=.3,BEAT=.4;
const ART={frame:"@@asset:assets/ui/r3z/frame.webp@@",letters:"@@asset:assets/ui/r3z/letters.webp@@",word:"@@asset:assets/ui/r3z/word.webp@@",pencil:"@@asset:assets/qix/pencil.webp@@"};
// The pencil drawing lies tip down-left: tip and eraser end in its own pixels; in the card it is PEN_L units long.
const PEN={tip:[5,226],end:[203.8,15.6]},PEN_L=36,PEN_IMG_L=Math.hypot(PEN.end[0]-PEN.tip[0],PEN.end[1]-PEN.tip[1]),PEN_A=Math.atan2(PEN.end[1]-PEN.tip[1],PEN.end[0]-PEN.tip[0]);
// Fx bursts from Jimothy (count, speed range, upward bias, gravity, life, size, colours, additive).
const KINDS={dust:[7,[14,34],10,-12,.45,2,['#9e99a8','#757085'],false],sparkle:[14,[20,60],30,-20,.7,1,['#fff299','#99ffff','#ffffff'],true],impact:[16,[60,140],20,200,.45,2,['#ffffff','#ffd980','#e680e6'],true],sparks:[6,[40,90],0,0,.25,1,['#99ffff','#ffffff'],true],flecks:[5,[12,36],18,90,.3,1,['#ffe08a','#c9a24a','#ffffff'],true]};
const clamp=x=>Math.max(0,Math.min(1,x)),lerp=(a,b,k)=>a+(b-a)*k,D=Math.PI/180;
const sine=k=>(1-Math.cos(Math.PI*clamp(k)))/2,outQ=k=>1-(1-clamp(k))**2,expoIn=k=>k<=0?0:2**(10*clamp(k)-10),expoOut=k=>k>=1?1:1-2**(-10*clamp(k));
const span=(t,a,b)=>clamp((t-a)/(b-a));
// Tip x along GAMES: at each tick the tip reaches that letter's left edge; it leaves the last letter's right edge at 3.15.
const WRITE_END=TICKS+TICK_STEP*4+(WORD[4][1]-WORD[4][0])/((WORD[4][0]-WORD[3][0])/TICK_STEP);
function tipX(t){if(t<=TICKS)return WORD[0][0];for(let i=0;i<4;i++){const a=TICKS+i*TICK_STEP;if(t<a+TICK_STEP)return lerp(WORD[i][0],WORD[i+1][0],(t-a)/TICK_STEP)}return lerp(WORD[4][0],WORD[4][1],span(t,TICKS+4*TICK_STEP,WRITE_END))}

class StudioSting{
 constructor(host,parent,{reduced=false}={}){
  this.host=host;this.reduced=reduced;this.state='loading';this.done=false;this.t=0;this.parts=[];this.fired=new Set();this.shake=0;this.voice=null;this.bornAt=performance.now();
  const el=this.el=document.createElement('div');el.className='studio-sting';el.setAttribute('role','img');el.setAttribute('aria-label','R3Z Games presents');
  Object.assign(el.style,{position:'absolute',inset:'0',zIndex:'60',background:'#07070a',opacity:'1',transition:'opacity .4s ease',touchAction:'none',userSelect:'none'});
  this.canvas=document.createElement('canvas');Object.assign(this.canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%'});this.ctx=this.canvas.getContext('2d');
  this.hint=document.createElement('p');Object.assign(this.hint.style,{position:'absolute',left:'0',right:'0',top:'50%',margin:'0',transform:'translateY(-50%)',textAlign:'center',font:'max(16px,2.04vh)/1 Schoolhand,sans-serif',letterSpacing:'.06em',color:'#bfb899',opacity:'0',pointerEvents:'none'});
  el.append(this.canvas,this.hint);parent.append(el);
  // Sound: with the sound setting on, make the context now (it may run at once if the browser allows) and decode the sting.
  const au=this.au=host.services.audio,save=host.services.save;this.sound=!!save?.settings?.sound;
  if(this.sound){try{au.unlock?.()}catch{}this.buffer=au.context?au.load('sfx','studio-sting'):Promise.resolve(null)}else this.buffer=Promise.resolve(null);
  this.img={};const loads=Object.entries(ART).map(([k,src])=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>{this.img[k]=i;ok()};i.onerror=no;i.src=src}));
  Promise.all(loads).then(()=>this.ready(),()=>this.stop());
  this.timeout=setTimeout(()=>{if(this.state==='loading')this.stop()},4000);
 }
 // Tinted copies of a part for the colour split, the flare and the hot trace tip.
 tint(img,color){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);x.globalCompositeOperation='source-in';x.fillStyle=color;x.fillRect(0,0,c.width,c.height);return c}
 async ready(){
  if(this.done)return;const I=this.img;this.splitA=this.tint(I.letters,'#33e6ff');this.splitB=this.tint(I.letters,'#ff4073');this.hot=this.tint(I.frame,'#fff8d9');
  const au=this.au,running=()=>au.context?.state==='running';
  if(this.sound&&au.context&&!running())await Promise.race([au.context.resume().catch(()=>{}),new Promise(r=>setTimeout(r,250))]);
  if(this.done)return;
  // Sound still locked (no tap or key on this page yet): the card plays silent rather than waiting.
  if(false&&this.sound&&!running()&&!this.reduced){/* no wait screen; with sound still locked the card plays silent */this.state='gate';this.gateAt=performance.now();const d=this.host.deviceMode||'keyboard';this.hint.textContent=d==='touch'?'tap to start':d==='xbox'?'press any button':'press any key';return}
  this.begin(0);
 }
 // A short black beat (after the gate's press), and the sting's buffer if it is still decoding (at most a second more; one
 // that arrives later still joins in time, from where the card is, during the first second).
 begin(delay){this.state='beat';this.hint.style.opacity='0';const at=performance.now();let buf=null;const go=()=>{if(this.done||this.state!=='beat')return;this.state='play';this.start=performance.now();if(buf)this.play(buf,0);else this.buffer.then(b=>{if(b&&this.state==='play'&&this.t<1.2)this.play(b,this.t)},()=>{})};
  Promise.race([this.buffer.then(b=>buf=b,()=>null),new Promise(r=>setTimeout(r,1000+delay*1000))]).then(()=>setTimeout(go,Math.max(0,delay*1000-(performance.now()-at))))}
 play(buffer,offset=0){const au=this.au;if(!buffer||!this.sound||!au.master||au.context?.state!=='running'||!this.host.services.save.settings.sound)return;try{const c=au.context,s=c.createBufferSource(),a=c.createGain();s.buffer=buffer;a.gain.value=.9;s.connect(a).connect(au.master);s.start(0,offset);this.voice={s,a}}catch{}}
 fade(seconds){const v=this.voice,c=this.au.context;if(!v||!c)return;this.voice=null;try{const t=c.currentTime;v.a.gain.cancelScheduledValues(t);v.a.gain.setValueAtTime(v.a.gain.value,t);v.a.gain.linearRampToValueAtTime(0,t+seconds);v.s.stop(t+seconds+.05)}catch{}}
 // Any key, click, tap or pad button: the gate's press starts the card; after the first moments a press skips it.
 press(){if(this.done)return;if(this.state==='gate'){if(performance.now()-this.gateAt<200)return;try{this.au.unlock?.();this.au.context?.resume?.()}catch{}this.begin(BEAT);return}
  if(this.state==='play'&&this.t>=SKIP_AFTER){this.fade(.25);this.stop()}}
 key(e){if(['Shift','Control','Alt','Meta','CapsLock','Fn','OS'].includes(e.key))return;if(e.metaKey||e.ctrlKey||e.altKey||/^F\d+$/.test(e.key))return;e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)this.press()}
 stop(){if(this.done)return;this.done=true;this.state='done';clearTimeout(this.timeout);if(this.reduced)this.fade(.5)}
 // The card's overlay fades away over the title, then leaves the page.
 dispose(){if(this.gone)return;this.gone=true;this.stop();const el=this.el;el.style.opacity='0';setTimeout(()=>el.remove(),450)}
 burst(x,y,kind,scale=1){const [n,sp,up,grav,life,size,cols,add]=KINDS[kind],count=Math.max(1,Math.round(n*scale)),k=Math.sqrt(scale);for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=lerp(sp[0],sp[1],Math.random())*k;this.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-up,age:0,life:life*lerp(.7,1.2,Math.random()),c:cols[i%cols.length],size,add,grav})}}
 once(id,t,at,fn){if(t>=at&&!this.fired.has(id)){this.fired.add(id);fn()}}
 update(){
  if(this.done)return;const now=performance.now(),dt=Math.min(.05,(now-(this.last??now))/1000);this.last=now;
  if(this.state==='gate'){this.hint.style.opacity=String(this.reduced?.85:.55+.35*Math.cos((now-this.gateAt)/1000*Math.PI/.9));this.blank();return}
  if(this.state!=='play'){this.blank();return}
  const t=this.t=(now-this.start)/1000;if(t>=(this.reduced?STILL:END)){this.stop();return}
  if(!this.reduced){const fr=FR,heads=this.heads(this.trace(t));
   if(t>TRACE[0]&&t<TRACE[1]&&Math.random()<Math.min(1,dt*36))this.burst(...heads[Math.random()<.5?0:1],'sparks',.5);
   this.once('frame',t,TRACE[1],()=>{for(const h of this.heads(1))this.burst(...h,'sparks',1.2)});
   this.once('slam',t,SLAM,()=>{this.shake=1;const mx=SIZE[0]/2,my=74;this.burst(mx,my,'impact',1.4);this.burst(mx-60,my+28,'dust');this.burst(mx+60,my+28,'dust')});
   this.once('land',t,TICKS-.01,()=>this.burst(WORD[0][0],WORD_Y+8,'dust',.3));
   WORD.forEach((w,i)=>this.once('letter'+i,t,TICKS+i*TICK_STEP,()=>this.burst(w[0]+2,WORD_Y+8,'flecks')));
   this.once('glint',t,GLINT+.3,()=>this.burst(fr.x+fr.w,fr.y+10,'sparkle',.8));
   this.shake=Math.max(0,this.shake-dt/.35);
   for(const p of this.parts){p.age+=dt;p.vy+=p.grav*dt;const drag=1-2.5*dt;p.vx*=drag;p.vy*=drag;p.x+=p.vx*dt;p.y+=p.vy*dt}this.parts=this.parts.filter(p=>p.age<p.life)}
  this.draw(t);
 }
 trace(t){return this.reduced?1:sine(span(t,TRACE[0],TRACE[1]))}
 // The two spark heads at trace progress p (mirror images), as in splash.gd.
 heads(p){const {x,y,w,h}=FR,s=p*(w+h),cx=x+w/2;let l;if(s<w/2)l=[cx-s,y+h];else if(s<w/2+h)l=[x,y+h-(s-w/2)];else l=[x+(s-w/2-h),y];return [l,[2*cx-l[0],l[1]]]}
 // Rectangles covering the frame's outline between a and b (the trace parameter: bottom centre out, up the sides, along the top).
 outline(a,b,m=4){const {x:L,y:T,w:W,h:H}=FR,R=L+W,B=T+H,cx=L+W/2,half=W/2,r=[];let lo=Math.max(a,0),hi=Math.min(b,half);
  if(hi>lo){const e=hi>=half?hi+m:hi;r.push([cx-e,B-m,e-lo,2*m],[cx+lo,B-m,e-lo,2*m])}
  lo=Math.max(a,half);hi=Math.min(b,half+H);if(hi>lo){let y0=B-(hi-half);const y1=B-(lo-half);if(hi>=half+H)y0-=m;r.push([L-m,y0,2*m,y1-y0],[R-m,y0,2*m,y1-y0])}
  lo=Math.max(a,half+H);hi=Math.min(b,W+H);if(hi>lo){const d0=lo-half-H,d1=hi-half-H;r.push([L+d0,T-m,d1-d0,2*m],[R-d1,T-m,d1-d0,2*m])}return r}
 clipTo(c,rects){c.beginPath();for(const q of rects)c.rect(...q);c.clip()}
 // The pencil: its tip, and the direction from the tip to its eraser end.
 pencil(t){
  if(this.reduced)return {x:WORD[4][1]+6,y:WORD_Y+15,a:300*D,alpha:1};/* the still card: resting just after the word, leaning away from it */
  const T=FR.y,stand=(bx,by,a)=>({x:bx-PEN_L*Math.cos(a),y:by-PEN_L*Math.sin(a),a,alpha:1});
  if(t<1.7)return null;
  if(t<1.98){const k=span(t,1.7,1.98),bx=lerp(FR.x-24,50,k),by=T-8*Math.sin(Math.PI*k),p=stand(bx,by,(90+18*Math.sin(Math.PI*k))*D);p.alpha=clamp((t-1.7)/.06);return p}
  if(t<2.18){const k=span(t,1.98,2.18);return stand(lerp(50,70,k),T-9*Math.sin(Math.PI*k),(90+10*Math.sin(Math.PI*k))*D)}
  // The peek: a little tilt toward R3Z, a nod, and back up.
  if(t<2.46){const k=span(t,2.18,2.46),lean=k<.3?outQ(k/.3):k<.75?1:1-sine((k-.75)/.25),nod=k>.3&&k<.75?Math.sin((k-.3)/.45*Math.PI*2)*4:0;return stand(70,T,(90+26*lean+nod)*D)}
  // The dive: up, over the frame's left side and down onto the start of the word, turning tip down to write.
  const a0=90*D,a1=240*D,start=[70,T-PEN_L],end=[WORD[0][0],WORD_Y+7.5],ctl=[6,-70];
  if(t<2.74){const k=span(t,2.46,2.74),q=1-k;return {x:q*q*start[0]+2*k*q*ctl[0]+k*k*end[0],y:q*q*start[1]+2*k*q*ctl[1]+k*k*end[1],a:lerp(a0,a1,sine(k)),alpha:1}}
  if(t<WRITE_END){const w=t<TICKS?0:t-TICKS,zig=Math.abs(((w/.05)%2)-1)*2-1;return {x:tipX(t),y:WORD_Y+7.5+(t<TICKS?0:5.5*zig),a:a1+5*D*Math.sin(w/TICK_STEP*Math.PI*2),alpha:1}}
  if(t<3.3){const k=sine(span(t,WRITE_END,3.3));return {x:lerp(WORD[4][1],WORD[4][1]+5,k),y:lerp(WORD_Y+7.5,WORD_Y-2,k),a:lerp(a1,270*D,k),alpha:1}}
  // And off: a hop up and to the right, spinning, then down off the screen (the card's fade takes it if the screen is tall).
  const s=t-3.3,x=WORD[4][1]+5+60*s,y=WORD_Y-2-300*s+900*s*s;return {x,y,a:270*D+520*D*s,alpha:1};
 }
 blank(){const c=this.canvas,d=Math.min(2,g.devicePixelRatio||1),w=innerWidth,h=innerHeight;if(c.width!==Math.round(w*d)||c.height!==Math.round(h*d)){c.width=Math.round(w*d);c.height=Math.round(h*d)}const x=this.ctx;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,c.width,c.height);return {x,d,w,h}}
 draw(t){
  const {x:c,d,w,h}=this.blank(),I=this.img,R=this.reduced;
  // About 260 px of a 640 x 360 screen (as in Jimothy), larger on a standing phone; centred with room above the frame for
  // the pencil standing on it and below for "presents".
  const top=PEN_L+10,tall=top+SIZE[1]+24,s=Math.min(w*(w>h?.41:.72)/SIZE[0],h*.84/tall),j=this.shake>0?3/1.3*this.shake:0,ox=(w-SIZE[0]*s)/2+Math.round(Math.random()*2-1)*j*s,oy=(h-tall*s)/2+top*s+Math.round(Math.random()*2-1)*j*s;
  const cardA=R?Math.min(clamp(t/.25),1-span(t,STILL-.3,STILL)):1-span(t,4.2,END),frameA=R?1:1-sine(span(t,3.75,4.15));
  c.setTransform(d,0,0,d,0,0);
  const glow=c.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)*.6);glow.addColorStop(0,'rgba(40,34,48,'+(.55*cardA)+')');glow.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=glow;c.fillRect(0,0,w,h);
  c.setTransform(d*s,0,0,d*s,d*ox,d*oy);c.globalAlpha=cardA;const full=(img,dx=0)=>c.drawImage(img,dx,0,SIZE[0],SIZE[1]);
  // The frame, revealed along its outline behind the sparks, with a hot tip just behind them.
  const p=this.trace(t),edge=p*(FR.w+FR.h);
  if(edge>0){c.save();c.globalAlpha=cardA*frameA;if(p<1)this.clipTo(c,this.outline(0,edge));full(I.frame);c.restore();
   if(p<1){c.save();c.globalCompositeOperation='lighter';for(const [a,k] of [[14,.35],[8,.6],[3,.9]]){c.save();c.globalAlpha=cardA*k;this.clipTo(c,this.outline(edge-a,edge));full(this.hot);c.restore()}c.restore()}}
  if(!R){const fl=1-span(t,TRACE[1],TRACE[1]+.5);if(t>=TRACE[1]&&fl>0){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=cardA*fl;full(I.frame);c.globalAlpha=cardA*fl*.45;full(this.hot);c.restore()}}
  // R3Z: the slam from 1.7x, then the colour split sliding back in.
  const la=R?1:clamp((t-(SLAM-.12))/.1);
  if(!R&&t>=SLAM){const k=span(t,SLAM,SLAM+.35),off=7*(1-expoOut(k)),a=.8*(1-span(t,SLAM,SLAM+.45));if(a>0){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=cardA*a;full(this.splitA,-off);full(this.splitB,off);c.restore()}}
  if(la>0){c.save();c.globalAlpha=cardA*la;const sc=R||t>=SLAM?1:1.7-.7*expoIn(span(t,SLAM-.12,SLAM)),px=SIZE[0]/2,py=SIZE[1]/2-14;c.translate(px,py);c.scale(sc,sc);c.translate(-px,-py);full(I.letters);c.restore()}
  // GAMES, each letter written in as the pencil's tip passes over it, a bright edge right behind the tip.
  const tx=R?SIZE[0]:t>=WRITE_END?SIZE[0]:tipX(t);
  if(R||t>=TICKS){WORD.forEach(([a,b],i)=>{if(!R&&t<TICKS+i*TICK_STEP)return;const r=Math.min(b+1,tx);if(r<=a-1)return;c.save();c.beginPath();c.rect(a-1,WORD_Y-2,r-a+1,SIZE[1]-WORD_Y+2);c.clip();full(I.word);if(!R&&t<WRITE_END&&tx<b+1){c.globalCompositeOperation='lighter';c.beginPath();c.rect(tx-3,WORD_Y-2,3,SIZE[1]-WORD_Y+2);c.clip();full(I.word);full(I.word)}c.restore()})}
  // The square shockwave after the trace.
  if(!R){const r=span(t,TRACE[1],TRACE[1]+.7);if(t>=TRACE[1]&&r<1){const grow=6+60*r;c.strokeStyle='rgba(255,217,128,'+(.6*(1-r)*cardA)+')';c.lineWidth=2*(1-r)+.5;c.strokeRect(FR.x-grow,FR.y-grow,FR.w+2*grow,FR.h+2*grow)}}
  // The spark heads (Jimothy's neon glow).
  if(!R&&t>TRACE[0]&&t<TRACE[1]){c.save();c.globalCompositeOperation='lighter';for(const [hx,hy] of this.heads(p)){const gr=c.createRadialGradient(hx,hy,0,hx,hy,22.4);gr.addColorStop(0,'rgba(255,217,128,1)');gr.addColorStop(1,'rgba(255,217,128,0)');c.fillStyle=gr;c.fillRect(hx-23,hy-23,46,46)}c.restore()}
  // Her pencil.
  const pen=this.pencil(t);if(pen&&I.pencil){const k=PEN_L/PEN_IMG_L;c.save();c.globalAlpha=cardA*pen.alpha;c.translate(pen.x,pen.y);c.rotate(pen.a-PEN_A);c.scale(k,k);c.drawImage(I.pencil,-PEN.tip[0],-PEN.tip[1]);c.restore()}
  // "presents".
  const pa=R?1:clamp((t-GLINT-.1)/.5);if(pa>0){c.save();c.globalAlpha=cardA*pa;c.fillStyle='#ccb880';c.font='9px Schoolhand, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('presents',SIZE[0]/2,SIZE[1]+16);c.restore()}
  // Debris, sparks and flecks: crisp squares, the bright ones added.
  for(const q of this.parts){const k=q.age/q.life,sz=k<.6?q.size:Math.max(1,q.size-1);c.globalCompositeOperation=q.add?'lighter':'source-over';c.globalAlpha=cardA*(1-k*k);c.fillStyle=q.c;c.fillRect(Math.round(q.x),Math.round(q.y),sz,sz)}
  c.globalCompositeOperation='source-over';c.globalAlpha=1;
  // The slam's flash over the whole screen.
  if(!R&&t>=SLAM&&t<SLAM+.14){c.setTransform(d,0,0,d,0,0);c.fillStyle='rgba(255,247,230,'+(.5*(1-outQ((t-SLAM)/.14)))+')';c.fillRect(0,0,w,h)}
 }
}
g.No2Sting=StudioSting;
})(globalThis);
