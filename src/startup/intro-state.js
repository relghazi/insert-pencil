
'use strict';
(function(g){
class IntroState{
 constructor({manual=false,reduced=false,seen=false,replay=false}={}){this.active=!seen||replay;this.page=0;this.panel=-1;this.elapsed=0;this.held=0;this.duration=7.8;this.holdSeconds=.8;this.manual=manual;this.reduced=reduced;this.path=reduced?'crossfade':'guided-panels';this.finished=false;this.reason=null}
 update(dt,held=false){if(!this.active)return;dt=Math.max(0,Math.min(.1,dt));this.held=held?this.held+dt:0;if(this.held+1e-9>=this.holdSeconds){this.finish('held-skip');return}this.elapsed+=dt;if(!this.manual){const duration=this.panel<0?.8:3.8;if(this.elapsed+1e-9>=duration){const remainder=this.elapsed-duration;this.next();this.elapsed=remainder}}}
 next(){if(!this.active)return;const panels=this.page===4?3:2;if(this.panel<panels-1)this.panel++;else if(this.page===8)this.finish('final-page');else{this.page++;this.panel=-1}this.elapsed=0}
 previous(){if(this.active){if(this.panel>=0)this.panel--;else{this.page=Math.max(0,this.page-1);this.panel=-1}this.elapsed=0}}
 finish(reason){this.active=false;this.finished=true;this.reason=reason;this.held=0}
 get progress(){return Math.min(1,this.held/this.holdSeconds)}
}
class DevicePrompts{
 constructor(){this.controller=false}
 update(pads){this.controller=Array.from(pads||[]).some(p=>p&&p.connected);return this.controller}
 get labels(){return this.controller?{select:'A',back:'B',navigate:'D-pad',desk:'LB + D-pad',skip:'Hold A to skip',next:'A',previous:'X'}:{select:'Enter',back:'Esc',navigate:'Arrow keys',desk:'Tab / Arrow keys',skip:'Hold Space to skip',next:'Right arrow',previous:'Left arrow'}}
}
g.No2Intro={IntroState,DevicePrompts};if(typeof module!=='undefined')module.exports=g.No2Intro;
})(globalThis);



'use strict';
(function(g){
const svg=(body,label)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 48" role="img" aria-label="'+label+'">'+body+'</svg>';
function glyph(key,device='keyboard'){if(key.includes('+')){const parts=key.split('+');return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+parts.length*80+' 48" aria-label="'+key+'">'+parts.map((part,i)=>'<g transform="translate('+i*80+' 0)">'+glyph(part,device).replace(/<svg[^>]*>/,'').replace('</svg>','')+'</g>').join('')+'</svg>';}
 const text=(s,x=40,y=32,size=24)=>'<text x="'+x+'" y="'+y+'" text-anchor="middle" font-family="ProductPrint,monospace" font-size="'+size+'" font-weight="600" fill="currentColor">'+s+'</text>';
 if(device==='touch')return svg('<path d="M27 32V16q0-7 5-7t5 7v9l3-7q4-5 7 0l3 11q1 12-11 14H27l-9-12q-3-6 2-7z" fill="none" stroke="currentColor" stroke-width="3"/>'+(key==='hold'?'<path d="M51 5a18 18 0 0 1 15 18" fill="none" stroke="currentColor" stroke-width="3"/>':''),key==='hold'?'hold':'tap');
 if(device==='xbox'){
 const colors={A:'#2d823e',B:'#b92f32',X:'#245fab',Y:'#d7b636'};
 if(colors[key])return svg('<circle cx="40" cy="24" r="20" fill="'+colors[key]+'" stroke="#242b2c" stroke-width="2"/>'+text(key,40,33,27),key);
 if(key==='D-pad')return svg('<path d="M31 4h18v11h13v18H49v11H31V33H18V15h13z" fill="#41494e" stroke="#eee7ce" stroke-width="2"/>',key);
 if(key==='stick')return svg('<circle cx="40" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="40" cy="24" r="8" fill="currentColor"/>',key);
 if(key==='View')return svg('<path d="M23 12h27v19H23z M31 19h27v19H31z" fill="none" stroke="currentColor" stroke-width="3"/>',key);
 if(key==='Menu')return svg('<path d="M24 14h32M24 24h32M24 34h32" stroke="currentColor" stroke-width="4"/>',key);
 return svg('<path d="M12 9Q40 1 68 9v31H12z" fill="#e3dfcf" stroke="#343b3e" stroke-width="2"/>'+text(key,40,31,21),key);
 }
 if(['Left','Right','Up','Down'].includes(key)){const a={Left:180,Right:0,Up:270,Down:90}[key];return svg('<rect x="15" y="4" width="50" height="40" rx="7" fill="#eee7d2" stroke="#343b3e" stroke-width="2"/><path transform="rotate('+a+' 40 24)" d="M27 24h25m-9-9 10 9-10 9" stroke="#343b3e" stroke-width="3" fill="none"/>',key)}
 return svg('<rect x="5" y="4" width="70" height="40" rx="7" fill="#eee7d2" stroke="#343b3e" stroke-width="2"/>'+text(key,40,31,key.length>4?16:22),key);
}
function button(el,key,word,device='keyboard'){const signature=device+'|'+key+'|'+word;if(el.dataset.glyphSignature===signature)return;el.dataset.glyphSignature=signature;el.replaceChildren();const icon=document.createElement('span');icon.className='device-glyph'+(key.includes('+')?' combo':'');icon.innerHTML=glyph(key,device);el.append(icon,document.createTextNode(' '+word));el.setAttribute('aria-label',key+' '+word)}
function nearest(regions,current,dx,dy){if(!regions.length)return null;const origin=regions.find(r=>r.id===current)||regions[0],cx=origin.x+origin.w/2,cy=origin.y+origin.h/2;let best=null,cost=Infinity;for(const r of regions){if(r.id===origin.id)continue;const x=r.x+r.w/2-cx,y=r.y+r.h/2-cy,forward=x*dx+y*dy;if(forward<=1)continue;const side=Math.abs(x*dy-y*dx),score=Math.hypot(x,y)+side*1.8;if(score<cost){best=r;cost=score}}return best||origin}
function sevenSegments(value){const masks=[0x3f,0x06,0x5b,0x4f,0x66,0x6d,0x7d,0x07,0x7f,0x6f];return Math.max(0,Math.floor(Number(value)||0)).toLocaleString('en-US',{useGrouping:false,maximumFractionDigits:0}).split('').map(n=>masks[+n])}
class MotionTimeline{
 constructor(panels,{manual=false,reduced=false}={}){this.panels=panels;this.index=0;this.elapsed=0;this.held=0;this.active=true;this.manual=manual;this.reduced=reduced;this.reason=null}
 get current(){return this.panels[this.index]}
 update(dt,held=false,heldSeconds=null){if(!this.active)return;dt=Math.max(0,Number.isFinite(dt)?dt:0);this.held=held?(heldSeconds??this.held+dt):0;if(this.held+1e-9>=.8){this.finish('held-skip');return}this.elapsed+=dt;while(this.active&&!this.manual&&this.elapsed+1e-9>=this.current.duration){const extra=this.elapsed-this.current.duration;this.next();this.elapsed=extra}}
 next(){if(!this.active)return;if(this.index+1<this.panels.length){this.index++;this.elapsed=0}else this.finish('final-panel')}
 previous(){this.index=Math.max(0,this.index-1);this.elapsed=0}
 finish(reason){this.active=false;this.reason=reason;this.held=0}
 get progress(){return Math.min(1,this.held/.8)}
}
g.No2UI={glyph,button,nearest,sevenSegments,MotionTimeline};
})(globalThis);
