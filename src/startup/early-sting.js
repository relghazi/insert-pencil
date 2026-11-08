'use strict';
// The website's early script: on no2arca.de (build.cjs --web) the build puts sting.js and this file in one
// script at the top of the page (right after its CSP), before the loading cassette and every other script. The loading
// cassette's bar is shared between the page itself (the build's marks, up to SHARE) and the files the title waits for (REST
// bytes); MotionComic.start says when the title is ready (ready). Since the start gate the studio card
// plays after the first press, as in the single offline file: the cassette while loading, the press, the card, the title.
(function(g){
const LOADING=JSON.parse('@@web-loading@@'),FONT="@@asset:assets/arcade/v044/fonts/PatrickHand-Regular.ttf@@",SOUND="@@asset:assets/audio/sfx/studio-sting.m4a@@";
// Files already on their way before the locker asks for anything (the card's and the cassette's own) are not its progress.
const SKIP=new Set([FONT,SOUND,"@@asset:assets/ui/loading-cassette.webp@@","@@asset:assets/ui/r3z/frame.webp@@","@@asset:assets/ui/r3z/letters.webp@@","@@asset:assets/ui/r3z/word.webp@@","@@asset:assets/qix/pencil.webp@@"].map(u=>new URL(u,location.href).href));
const html=document.documentElement,E=g.No2EarlySting={isReady:false,freed:false,ready,cassette};
/* Since the start gate (like Jimothy's) the card plays after the first press, with its sound, not while
   the page loads: the cassette shows from the start (MotionComic starts the card). */free();
watchProgress();

// The cassette's picture (build --web keeps it as data-src) waits until the card's own files are in, or loads at once.
function free(){E.freed=true;cassette()}
// After the card the cassette shows whole or not at all (a half-loaded picture is hidden until it is in; the bar shows meanwhile).
function cassette(){const i=E.freed&&document.querySelector('#loading-card img[data-src]');if(!i)return;i.fetchPriority='high';i.src=i.dataset.src;i.removeAttribute('data-src');
}
// The title is ready (or the desk failed to open): the cassette leaves as it does after the single file loads.
function ready(after){const go=()=>{if(E.isReady)return;E.isReady=true;(document.body||html).classList.add('no2-ready')};Promise.resolve(after).then(go,go)}
// After the page's last script the bar follows the files the title waits for to just short of the end: by the bytes that have
// arrived, or, while big files are still on their way, by the time they should take at the speed the page itself came in.
function watchProgress(){
 let got=0,shown=null,last=0,obs=null;
 try{obs=new PerformanceObserver(list=>{for(const r of list.getEntries())if(!SKIP.has(r.name))got+=r.encodedBodySize||0});obs.observe({type:'resource',buffered:true})}catch{}
 document.addEventListener('DOMContentLoaded',()=>{
  const bar=document.querySelector('#loading-card b i'),packs=[...document.querySelectorAll('#loading-card .inside .pack')];if(!bar)return;
  const reel=(q,left)=>{const f=left?1-q:q;return Math.sqrt(f+.543*.543*(1-f))},t0=performance.now();
  let rate=0;try{const n=performance.getEntriesByType('navigation')[0];rate=(n.encodedBodySize||n.transferSize||0)/Math.max(1,n.responseEnd-n.responseStart)}catch{}
  const tick=now=>{if(E.isReady){obs?.disconnect();return}
   if(shown===null){try{const t=getComputedStyle(bar).transform;shown=t&&t!=='none'?new DOMMatrix(t).a:0}catch{shown=0}shown=Math.max(shown,0)||LOADING.share;bar.style.animation='none';for(const p of packs)p.style.animation='none'}
   const target=LOADING.share+(1-LOADING.share)*Math.min(.97,Math.max(got,.9*rate*(now-t0))/LOADING.rest),dt=Math.min(.1,(now-(last||now))/1000);last=now;
   shown=Math.max(shown,shown+(target-shown)*Math.min(1,dt*3));
   bar.style.transform='scaleX('+shown.toFixed(4)+')';for(const p of packs)p.style.transform='scale('+reel(shown,p.classList.contains('l')).toFixed(4)+')';
   requestAnimationFrame(tick)};
  requestAnimationFrame(tick)},{once:true});
}
})(globalThis);
