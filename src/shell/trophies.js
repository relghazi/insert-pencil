'use strict';
// Tiny victories as console trophies (owner 2026-10-26, PS5 style on paper torn out of her notebook). The popup is a
// torn notebook slip with her reward sticker, written in BIC 4-color ballpoint (header red, name blue, tier and points
// black, dates green), never quite straight: a small rotation and offset fixed per victory id. The list, tiers, points,
// platinum and earned dates live in victories.js; host.js only calls init, toast and sheet.
(function(g){
const doc=g.document;if(!doc)return;
const make=(tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
// A small hand-placed tilt and nudge, the same every time for the same victory.
const jitter=id=>{let h=2166136261;for(const c of id)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;const f=k=>((h>>>k)&255)/255-.5;return{r:(f(0)*5).toFixed(2),x:(f(8)*14).toFixed(1),y:(f(16)*10).toFixed(1)}};
const CSS=`
#trophy-toast,body.locker-hub #desk-dialog #dialog-content .trophy-list,body.locker-hub #desk-dialog #dialog-content .trophy-head{--bic-blue:#1d3f9e;--bic-red:#c1272d;--bic-green:#1d7a3c;--bic-black:#262626}
.tb{display:inline-block;flex:none;background:center/contain no-repeat;aspect-ratio:1}
.tb-bronze{background-image:url(@@asset:assets/ui/victories/badge-bronze.webp@@)}
.tb-silver{background-image:url(@@asset:assets/ui/victories/badge-silver.webp@@)}
.tb-gold{background-image:url(@@asset:assets/ui/victories/badge-gold.webp@@)}
.tb-platinum{background-image:url(@@asset:assets/ui/victories/badge-platinum.webp@@);aspect-ratio:.79}
.tb.locked{filter:grayscale(1) contrast(.7) brightness(1.15);opacity:.38}
#trophy-toast{position:fixed;z-index:61;display:flex;align-items:center;gap:.6em;pointer-events:none;font-family:Hand,Schoolhand,sans-serif;visibility:hidden;box-sizing:border-box;
  width:calc(500 * var(--u));min-width:290px;aspect-ratio:3.9;padding:calc(30 * var(--u)) 1.2em calc(22 * var(--u)) calc(44 * var(--u));background:url(@@asset:assets/ui/victories/slip-wide.webp@@) center/100% 100% no-repeat;filter:drop-shadow(1px 4px 5px #2d211c55);
  rotate:var(--tilt,0deg);translate:var(--nx,0) var(--ny,0)}
#trophy-toast.show{visibility:visible;animation:tt-in 4.2s cubic-bezier(.2,.8,.3,1) both}
#trophy-toast.out{animation:tt-out .4s ease both}
@keyframes tt-in{0%{opacity:0;transform:translateX(35%)}9%,100%{opacity:1;transform:none}}
@keyframes tt-out{from{opacity:1}to{opacity:0;transform:translateX(20%)}}
#trophy-toast .tb{width:calc(66 * var(--u));min-width:40px}
#trophy-toast .tt-text{display:flex;flex-direction:column;gap:.18em;min-width:0;line-height:1.2}
#trophy-toast .tt-head{font-size:var(--t-meta);color:var(--bic-red)}
#trophy-toast .tt-name{font-size:var(--t-control);color:var(--bic-blue)}
#trophy-toast .tt-tier{font-size:var(--t-meta);color:var(--bic-black)}
#trophy-toast.stack{flex-direction:column;justify-content:center;text-align:center;gap:.15em;min-width:0;aspect-ratio:auto;padding:1.1em .7em .9em 1.2em;background-image:url(@@asset:assets/ui/victories/slip-square.webp@@)}
#trophy-toast.band{width:auto;min-width:0;aspect-ratio:auto;padding:.5em 1.1em .45em 1.3em;gap:.5em}
#trophy-toast.band .tt-head{display:none}
#trophy-toast.band .tb{width:calc(46 * var(--u));min-width:30px}
#trophy-toast.band .tt-text{flex-direction:row;flex-wrap:wrap;align-items:baseline;gap:0 .6em}
body.reduce-motion #trophy-toast.show{animation:tt-fade 4.2s linear both}
@keyframes tt-fade{0%{opacity:0}6%,100%{opacity:1}}
/* trophy list, PS5 style, written in the same four inks */
body.locker-hub #desk-dialog #dialog-content .achievement-list.trophy-list{display:block!important;max-height:57vh;overflow-y:auto;padding-right:.8em;scrollbar-width:thin;scrollbar-color:#24354366 transparent;outline:none}
body.locker-hub #desk-dialog #dialog-content .trophy-head{display:grid;grid-template-columns:auto 1fr;gap:.2em 1em;align-items:center;margin:0 0 .5em}
body.locker-hub #desk-dialog #dialog-content .trophy-head>.tb{width:calc(64 * var(--u));min-width:40px;grid-row:span 2}
body.locker-hub #desk-dialog #dialog-content .trophy-sum{display:flex;flex-wrap:wrap;gap:.2em 1.4em;align-items:baseline;font-size:var(--t-control)!important;margin:0!important;line-height:1.2;color:var(--bic-black)}
body.locker-hub #desk-dialog #dialog-content .trophy-sum b{font-weight:400;font-size:var(--t-body);color:var(--bic-green)}
body.locker-hub #desk-dialog #dialog-content .trophy-tiers{display:flex;gap:1em;font-size:var(--t-meta)!important;align-items:center;margin-left:auto}
body.locker-hub #desk-dialog #dialog-content .trophy-tiers span{display:inline-flex;align-items:center;gap:.25em}
body.locker-hub #desk-dialog #dialog-content .trophy-tiers .tb{width:1.3em;min-width:0}
.ink-bar{position:relative;height:calc(22 * var(--u));min-height:12px;border:2px solid var(--bic-blue,#1d3f9e);border-radius:999px 860px 999px 900px/80% 100% 90% 100%;box-sizing:border-box;overflow:hidden;background:#fffaf055}
.ink-bar i{position:absolute;inset:0 auto 0 0;background:repeating-linear-gradient(-55deg,#1d3f9ecc 0 2px,transparent 2px 6px);border-right:2px solid #1d3f9e}
body.locker-hub #desk-dialog #dialog-content .trophy-group{display:flex;align-items:center;gap:1em;margin:.7em 0 .2em!important;padding-bottom:.15em;border-bottom:2px solid #24354355;font-family:Hand,Schoolhand,sans-serif;font-weight:400;font-size:var(--t-control)!important;color:var(--bic-red)!important}
body.locker-hub #desk-dialog #dialog-content .trophy-group>span:first-child{color:var(--bic-red)!important}
body.locker-hub #desk-dialog #dialog-content .trophy-group:first-child{margin-top:0!important}
body.locker-hub #desk-dialog #dialog-content .trophy-group .tg-count{font-size:var(--t-meta);margin-left:auto;white-space:nowrap;color:var(--bic-black)}
body.locker-hub #desk-dialog #dialog-content .trophy-group .ink-bar{width:calc(140 * var(--u));min-width:60px;flex:none}
body.locker-hub #desk-dialog #dialog-content .trophy{display:grid;grid-template-columns:auto 1fr auto;gap:0 .9em;align-items:center;padding:.3em 0;border-bottom:1px dashed #24354326}
body.locker-hub #desk-dialog #dialog-content .trophy>.tb{width:calc(56 * var(--u));min-width:34px}
body.locker-hub #desk-dialog #dialog-content .trophy strong{display:block;font-weight:400;font-size:var(--t-body)!important;line-height:1.2;margin-bottom:.12em;color:var(--bic-blue)}
body.locker-hub #desk-dialog #dialog-content .trophy p{font-size:var(--t-meta)!important;margin:0!important;line-height:1.25;color:var(--bic-black)}
body.locker-hub #desk-dialog #dialog-content .trophy .tr-side{text-align:right;font-size:var(--t-meta);line-height:1.2;white-space:nowrap;color:var(--bic-black)}
body.locker-hub #desk-dialog #dialog-content .trophy .tr-side .when{color:var(--bic-green)}
body.locker-hub #desk-dialog #dialog-content .trophy.locked strong,body.locker-hub #desk-dialog #dialog-content .trophy.locked p,body.locker-hub #desk-dialog #dialog-content .trophy.locked .tr-side{opacity:.55}
body.locker-hub #desk-dialog #dialog-content .trophy.locked .tr-side .when{color:var(--bic-black)}
`;
let ctx=null,queue=[],busy=false,el=null;
function init(c){ctx=c;if(!doc.getElementById('trophy-style')){const st=make('style');st.id='trophy-style';st.textContent=CSS;doc.head.append(st)}}
const badge=(tier,locked)=>{const b=make('span','tb tb-'+tier+(locked?' locked':''));b.setAttribute('aria-hidden','true');return b};
const title=game=>game==='general'?'anywhere':(g.No2Catalog.byId[game]?.title||game);
// A rising two-note pencil "ding" (three for a platinum) on the shell's own tone helper.
function ding(tier){const a=ctx?.audio;if(!a||!ctx.save.settings.sound)return;a.unlock?.();const notes=tier==='platinum'?[784,1046.5,1568]:[1046.5,1568];notes.forEach((f,i)=>{a.tone(f,i===notes.length-1?.45:.16,.032,'triangle',i*.1);a.tone(f*2,.08,.008,'sine',i*.1)});a.noise?.(.04,3200,.012)}
const rect=id=>{const e=doc.getElementById(id);if(!e||e.offsetParent===null)return null;const r=e.getBoundingClientRect();return r.width?r:null};
// Where the slip goes, never on the paper. Locker: top right. Play page: the locker's slip slot mirrored to the right
// (beside the page, or on the cover left of the notebook tag). Other notebook pages: beside the open book when there is
// room, else in the band above it, left of the tag.
function place(){const s=el.style,b=doc.body,view=b.dataset.view,st=b.style,gap=Math.round(innerHeight*.022),n=rect('book-breadcrumb'),c=rect('close-book');
  for(const k of ['left','right','top','maxWidth','marginTop','width','minHeight'])s[k]='';el.classList.remove('stack','band');
  const stack=(right,top,w)=>{el.classList.add('stack');Object.assign(s,{right:right+'px',top:top+'px',width:w+'px',maxWidth:w+'px',minHeight:(w*.95)+'px'})};
  const band=(right,mid,w)=>{el.classList.add('band');Object.assign(s,{right:right+'px',top:mid+'px',maxWidth:w+'px',marginTop:'calc(var(--band-h,0px) / -2)'})};
  if(view==='play'){const x=parseFloat(st.getPropertyValue('--slip-x'))||gap,y=parseFloat(st.getPropertyValue('--slip-y'))||gap,w=parseFloat(st.getPropertyValue('--slip-w'))||innerWidth*.3;
    if(st.getPropertyValue('--slip-head').trim()==='block')stack(x,(n?n.bottom:y)+gap,w);else band(innerWidth-x-w,y,w);return}
  const r=view!=='hub'&&ctx.renderer?.openBook?ctx.renderer.pageRect():null;
  // pageRect is the right page's writing area; the paper and cover reach about a fifth of its width further out.
  if(r){const side=innerWidth-(r.x+r.w*1.2)-2*gap,right=n?n.left-gap:r.x+r.w,left=c?c.right+gap:r.x;
    if(side>=150)return stack(gap,(n?n.bottom:0)+gap,Math.min(side,innerWidth*.2));
    if(r.y>=44)return band(innerWidth-right,r.y/2,Math.max(160,right-left))}
  s.right='2vw';s.top=gap+'px';s.maxWidth='60vw'}
function show(item){if(!el){el=make('div');el.id='trophy-toast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');doc.body.append(el)}
  const t=make('div','tt-text'),j=jitter(item.id);
  t.append(make('div','tt-head',item.tier==='platinum'?'you earned the platinum':'you earned a tiny victory'),make('div','tt-name',item.label),make('div','tt-tier',item.tier+', '+item.points+' points'));
  el.className='';el.replaceChildren(badge(item.tier),t);el.style.setProperty('--tilt',j.r+'deg');el.style.setProperty('--nx',j.x+'px');el.style.setProperty('--ny',j.y+'px');place();
  if(el.classList.contains('band'))el.style.setProperty('--band-h',el.offsetHeight+'px');
  el.setAttribute('aria-label','tiny victory unlocked: '+item.label+', '+item.tier+', '+item.points+' points');void el.offsetWidth;el.classList.add('show');ding(item.tier);
  // It follows the page while it shows (a notebook still opening, a turn to the play page, a resized window).
  const follow=setInterval(()=>{place();if(el.classList.contains('band'))el.style.setProperty('--band-h',el.offsetHeight+'px')},250);
  setTimeout(()=>{el.classList.add('out');setTimeout(()=>{clearInterval(follow);el.className='';busy=false;next()},420)},4200)}
// While a notebook is still opening the slip waits (up to about 3 s), so it lands beside the book, not where it was.
let waited=0;function next(){if(busy||!queue.length)return;const r=ctx.renderer,b=doc.body.dataset.view;if(b!=='hub'&&r&&(!r.openBook||r.busy)&&waited<10){waited++;setTimeout(next,300);return}waited=0;busy=true;show(queue.shift())}
// Queued in order, one slip at a time; it never takes focus or input.
function toast(v){if(!v)return;queue.push(v);next()}
// The trophy list: % complete, points and tier counts on top, then one group per notebook, earned first.
function sheet(content,kicker){const V=g.No2Victories,list=V.list,TIERS=V.TIERS,has=id=>ctx.save.progress.achievements.includes(id),dates=ctx.save.progress.victoryDates||{};
  const got=list.filter(v=>has(v.id));kicker.textContent=got.length+' of '+list.length;
  const head=make('div','trophy-head'),sum=make('p','trophy-sum'),tiers=make('span','trophy-tiers'),bar=make('div','ink-bar'),fill=make('i'),pct=Math.round(100*got.length/list.length);
  fill.style.width=pct+'%';bar.append(fill);bar.setAttribute('role','progressbar');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',String(pct));bar.setAttribute('aria-label','tiny victories complete');
  for(const t of TIERS){const s=make('span'),n=got.filter(v=>v.tier===t).length;s.append(badge(t,!n),make('span','',String(n)));s.setAttribute('aria-label',n+' '+t);tiers.append(s)}
  const pts=make('span');pts.append(make('b','',String(got.reduce((t,v)=>t+v.points,0))),' points');const done=make('span');done.append(make('b','',pct+'%'),' complete');sum.append(done,pts,tiers);
  head.append(badge('platinum',!got.some(v=>v.tier==='platinum')),sum,bar);content.append(head);
  const box=make('div','achievement-list trophy-list');box.tabIndex=0;box.setAttribute('aria-label','tiny victories list');
  for(const game of new Set(list.map(v=>v.game))){const rows=list.filter(v=>v.game===game),n=rows.filter(v=>has(v.id)).length;
    const gh=make('h2','trophy-group'),gb=make('div','ink-bar'),gf=make('i');gf.style.width=(100*n/rows.length)+'%';gb.append(gf);gb.setAttribute('aria-hidden','true');gh.append(make('span','',title(game)),make('span','tg-count',Math.round(100*n/rows.length)+'%'),gb);box.append(gh);
    for(const v of [...rows.filter(v=>has(v.id)),...rows.filter(v=>!has(v.id))]){const got=has(v.id),row=make('div','trophy'+(got?'':' locked')),txt=make('div'),side=make('div','tr-side');txt.append(make('strong','',v.label),make('p','',v.note));
      side.append(make('div','',v.tier),make('div','when',got?(dates[v.id]?'earned '+dates[v.id]:'earned'):'not yet'));row.append(badge(v.tier,!got),txt,side);box.append(row)}}
  content.append(box)}
g.No2Trophies={init,toast,sheet,get queued(){return queue.length+(busy?1:0)}};
})(globalThis);
