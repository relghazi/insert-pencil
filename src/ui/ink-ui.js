'use strict';
// Notebook-world UI art (owner-approved Nano Banana batch U, 2026-10-22).
// Every on-screen input prompt is drawn: keycaps for the keyboard, Xbox buttons when a controller
// is the active device. Replaces No2UI.glyph and No2UI.button before the host builds any prompt.
(function(g){
const art={
 key:"@@asset:assets/ui/key.webp@@",'key-wide':"@@asset:assets/ui/key-wide.webp@@",'key-space':"@@asset:assets/ui/key-space.webp@@",
 'key-up':"@@asset:assets/ui/key-up.webp@@",'key-down':"@@asset:assets/ui/key-down.webp@@",'key-left':"@@asset:assets/ui/key-left.webp@@",'key-right':"@@asset:assets/ui/key-right.webp@@",
 'xb-a':"@@asset:assets/ui/xb-a.webp@@",'xb-b':"@@asset:assets/ui/xb-b.webp@@",'xb-x':"@@asset:assets/ui/xb-x.webp@@",'xb-y':"@@asset:assets/ui/xb-y.webp@@",
 'xb-lb':"@@asset:assets/ui/xb-lb.webp@@",'xb-rb':"@@asset:assets/ui/xb-rb.webp@@",'xb-lt':"@@asset:assets/ui/xb-lt.webp@@",'xb-rt':"@@asset:assets/ui/xb-rt.webp@@",
 'xb-dpad':"@@asset:assets/ui/xb-dpad.webp@@",'xb-dpad-up':"@@asset:assets/ui/xb-dpad-up.webp@@",'xb-dpad-down':"@@asset:assets/ui/xb-dpad-down.webp@@",'xb-dpad-left':"@@asset:assets/ui/xb-dpad-left.webp@@",'xb-dpad-right':"@@asset:assets/ui/xb-dpad-right.webp@@",
 'xb-ls':"@@asset:assets/ui/xb-ls.webp@@",'xb-rs':"@@asset:assets/ui/xb-rs.webp@@",'xb-view':"@@asset:assets/ui/xb-view.webp@@",'xb-menu':"@@asset:assets/ui/xb-menu.webp@@",
 'ps-cross':"@@asset:assets/ui/ps-cross.webp@@",'ps-circle':"@@asset:assets/ui/ps-circle.webp@@",'ps-square':"@@asset:assets/ui/ps-square.webp@@",'ps-triangle':"@@asset:assets/ui/ps-triangle.webp@@",'ps-l1':"@@asset:assets/ui/ps-l1.webp@@",'ps-r1':"@@asset:assets/ui/ps-r1.webp@@",'ps-l2':"@@asset:assets/ui/ps-l2.webp@@",'ps-r2':"@@asset:assets/ui/ps-r2.webp@@",'ps-create':"@@asset:assets/ui/ps-create.webp@@",'ps-options':"@@asset:assets/ui/ps-options.webp@@",'ps-dpad':"@@asset:assets/ui/ps-dpad.webp@@"
};
const drawn=g.No2UI.glyph;
// The controller's own buttons (owner 2026-10-30): a PlayStation pad shows its cross, circle, square and triangle, L1/R1/L2/R2,
// Create and Options; a Steam controller its A, B, X, Y with L1/R1/L2/R2; any other pad the Xbox buttons. The game's
// controls stay in Xbox positions (A is cross, B circle, X square, Y triangle).
const PS={A:'ps-cross',B:'ps-circle',X:'ps-square',Y:'ps-triangle',LB:'ps-l1',RB:'ps-r1',LT:'ps-l2',RT:'ps-r2',View:'ps-create',Menu:'ps-options','D-pad':'ps-dpad'};
function padStyle(){const id=g.No2PadForce||g.No2Repairs?.padState?.id||'';/* No2PadForce: the controller being set up */return /054c|dualsense|dualshock|playstation/i.test(id)?'ps':/28de|steam/i.test(id)?'steam':'xbox'}
function padMap(){const st=padStyle();if(st==='ps')return{...xbox,...PS};if(st==='steam')return{...xbox,LB:'ps-l1',RB:'ps-r1',LT:'ps-l2',RT:'ps-r2'};return xbox}
g.No2PadStyle=padStyle;
const xbox={A:'xb-a',B:'xb-b',X:'xb-x',Y:'xb-y',LB:'xb-lb',RB:'xb-rb',LT:'xb-lt',RT:'xb-rt','D-pad':'xb-dpad',Up:'xb-dpad-up',Down:'xb-dpad-down',Left:'xb-dpad-left',Right:'xb-dpad-right',stick:'xb-ls',L:'xb-ls',R:'xb-rs',View:'xb-view',Menu:'xb-menu'};
const arrows={Up:'key-up',Down:'key-down',Left:'key-left',Right:'key-right'};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const img=(name,label)=>'<img class="ink-glyph ink-'+name+'" src="'+art[name]+'" alt="'+esc(label)+'" draggable="false">';
function glyph(key,device='keyboard'){
 key=String(key);
 if(device==='touch')return drawn(key,device);
 if(key.includes('/'))return key.split('/').map(k=>glyph(k.trim(),device)).join('<span class="ink-plus">/</span>');
 if(key.includes('+'))return key.split('+').map(k=>glyph(k.trim(),device)).join('<span class="ink-plus">+</span>');
 if(device==='xbox'){const m=padMap();return m[key]?img(m[key],key):drawn(key,device)}
 if(arrows[key])return img(arrows[key],key);
 const face=key==='Space'?'key-space':key.length>1?'key-wide':'key';
 return '<span class="ink-key ink-'+face+'" role="img" aria-label="'+esc(key)+'" style="background-image:url('+art[face]+')">'+esc(key)+'</span>';
}
// Same contract as the original No2UI.button: icon then word, cached by device, key and word.
function button(el,key,word,device='keyboard'){const signature='ink|'+device+(device==='xbox'?padStyle():'')+'|'+key+'|'+word;if(el.dataset.glyphSignature===signature)return;el.dataset.glyphSignature=signature;el.replaceChildren();const icon=document.createElement('span');icon.className='device-glyph'+(/[+/]/.test(key)?' combo':'');icon.innerHTML=glyph(key,device);el.append(icon,document.createTextNode(' '+word));el.setAttribute('aria-label',key+' '+word)}
// Tracing paper (owner 2026-10-26, approved from the prototype): whenever a message or button overlay holds play (ready, pause,
// banners that stop play, initials, final grade) a full sheet of vellum painted in style C (tracing-vellum) lies over the game's
// field with a quick fade, held by one translucent strip of masking tape across its top edge (a page element, never clipped).
// Everything on it is written with a BIC 4-Color pen: titles are hand-lettered art (red, green for good news, blue counters and
// letters composed from single glyphs), other lines blue, keys and buttons black on the cheat sheet's correction-fluid keycaps.
const vellumSrc="@@asset:assets/ui/tracing-vellum.webp@@",tapeSrc="@@asset:assets/ui/tracing-tape.webp@@",VELLUM=.62,FADE=.2,HAZE=3;
const BIC={red:0xc4212f,blue:0x1b3591,green:0x1d8a3d,black:0x1e1f26};
const TITLES={'all five in the jars.':"@@asset:assets/ui/headings/sheet-all-five-in-the-jars.webp@@",
 'avoid the spikes.':"@@asset:assets/ui/headings/sheet-avoid-the-spikes.webp@@",
 'beginner course passed.':"@@asset:assets/ui/headings/sheet-beginner-course-passed.webp@@",
 'bonus points':"@@asset:assets/ui/headings/sheet-bonus-points.webp@@",
 'you broke out!':"@@asset:assets/ui/headings/sheet-broke-out.webp@@",
 'champion course passed.':"@@asset:assets/ui/headings/sheet-champion-course-passed.webp@@",
 'chapter done.':"@@asset:assets/ui/headings/sheet-chapter-done.webp@@",
 'checked.':"@@asset:assets/ui/headings/sheet-checked.webp@@",
 'class dismissed.':"@@asset:assets/ui/headings/sheet-class-dismissed.webp@@",
 'defend the desks!':"@@asset:assets/ui/headings/sheet-defend-the-desks.webp@@",
 'dessert first.':"@@asset:assets/ui/headings/sheet-dessert-first.webp@@",
 'detention.':"@@asset:assets/ui/headings/sheet-detention.webp@@",
 'down the stairs.':"@@asset:assets/ui/headings/sheet-down-the-stairs.webp@@",
 'end of':"@@asset:assets/ui/headings/sheet-end-of.webp@@",
 'final grade.':"@@asset:assets/ui/headings/sheet-final-grade.webp@@",
 'friday.':"@@asset:assets/ui/headings/sheet-friday.webp@@",
 'graded:':"@@asset:assets/ui/headings/sheet-graded.webp@@",
 'hard landing.':"@@asset:assets/ui/headings/sheet-hard-landing.webp@@",
 'lunch is over.':"@@asset:assets/ui/headings/sheet-lunch-is-over.webp@@",
 'lunch is ruined.':"@@asset:assets/ui/headings/sheet-lunch-is-ruined.webp@@",
 '100 m':"@@asset:assets/ui/headings/sheet-m100.webp@@",
 '25 m':"@@asset:assets/ui/headings/sheet-m25.webp@@",
 '50 m':"@@asset:assets/ui/headings/sheet-m50.webp@@",
 '75 m':"@@asset:assets/ui/headings/sheet-m75.webp@@",
 'monday.':"@@asset:assets/ui/headings/sheet-monday.webp@@",
 'new high score!':"@@asset:assets/ui/headings/sheet-new-high-score.webp@@",
 'next chapter.':"@@asset:assets/ui/headings/sheet-next-chapter.webp@@",
 'next equation.':"@@asset:assets/ui/headings/sheet-next-equation.webp@@",
 'next level.':"@@asset:assets/ui/headings/sheet-next-level.webp@@",
 'next period.':"@@asset:assets/ui/headings/sheet-next-period.webp@@",
 'next semester.':"@@asset:assets/ui/headings/sheet-next-semester.webp@@",
 'nice landing.':"@@asset:assets/ui/headings/sheet-nice-landing.webp@@",
 'order up.':"@@asset:assets/ui/headings/sheet-order-up.webp@@",
 'out of fuel.':"@@asset:assets/ui/headings/sheet-out-of-fuel.webp@@",
 'out of paper.':"@@asset:assets/ui/headings/sheet-out-of-paper.webp@@",
 'out of time.':"@@asset:assets/ui/headings/sheet-out-of-time.webp@@",
 'paused':"@@asset:assets/ui/headings/sheet-paused.webp@@",
 'pencils down.':"@@asset:assets/ui/headings/sheet-pencils-down.webp@@",
 'perfect day!':"@@asset:assets/ui/headings/sheet-perfect-day.webp@@",
 'photo retake.':"@@asset:assets/ui/headings/sheet-photo-retake.webp@@",
 'point':"@@asset:assets/ui/headings/sheet-point.webp@@",
 'ready!':"@@asset:assets/ui/headings/sheet-ready.webp@@",
 'recess is over.':"@@asset:assets/ui/headings/sheet-recess-is-over.webp@@",
 'saturday.':"@@asset:assets/ui/headings/sheet-saturday.webp@@",
 'say cheese.':"@@asset:assets/ui/headings/sheet-say-cheese.webp@@",
 'split them up!':"@@asset:assets/ui/headings/sheet-split-them-up.webp@@",
 'sunday.':"@@asset:assets/ui/headings/sheet-sunday.webp@@",
 'tardy slip.':"@@asset:assets/ui/headings/sheet-tardy-slip.webp@@",
 'the coach wins.':"@@asset:assets/ui/headings/sheet-the-coach-wins.webp@@",
 'the end.':"@@asset:assets/ui/headings/sheet-the-end.webp@@",
 'thursday.':"@@asset:assets/ui/headings/sheet-thursday.webp@@",
 'training course.':"@@asset:assets/ui/headings/sheet-training-course.webp@@",
 'tuesday.':"@@asset:assets/ui/headings/sheet-tuesday.webp@@",
 'up the stairs.':"@@asset:assets/ui/headings/sheet-up-the-stairs.webp@@",
 'wave':"@@asset:assets/ui/headings/sheet-wave.webp@@",
 'wednesday.':"@@asset:assets/ui/headings/sheet-wednesday.webp@@",
 'you beat the coach!':"@@asset:assets/ui/headings/sheet-you-beat-the-coach.webp@@"};
// A title that reads as an ending in one game and good news in another has both inks; show(on,true) picks the red one.
const TITLES_END={'class dismissed.':"@@asset:assets/ui/headings/sheet-class-dismissed-red.webp@@"};
const GLYPHS={'0':"@@asset:assets/ui/headings/sheet-glyph-0.webp@@",
 '1':"@@asset:assets/ui/headings/sheet-glyph-1.webp@@",
 '2':"@@asset:assets/ui/headings/sheet-glyph-2.webp@@",
 '3':"@@asset:assets/ui/headings/sheet-glyph-3.webp@@",
 '4':"@@asset:assets/ui/headings/sheet-glyph-4.webp@@",
 '5':"@@asset:assets/ui/headings/sheet-glyph-5.webp@@",
 '6':"@@asset:assets/ui/headings/sheet-glyph-6.webp@@",
 '7':"@@asset:assets/ui/headings/sheet-glyph-7.webp@@",
 '8':"@@asset:assets/ui/headings/sheet-glyph-8.webp@@",
 '9':"@@asset:assets/ui/headings/sheet-glyph-9.webp@@",
 'A':"@@asset:assets/ui/headings/sheet-glyph-a.webp@@",
 'B':"@@asset:assets/ui/headings/sheet-glyph-b.webp@@",
 'C':"@@asset:assets/ui/headings/sheet-glyph-c.webp@@",
 'D':"@@asset:assets/ui/headings/sheet-glyph-d.webp@@",
 'E':"@@asset:assets/ui/headings/sheet-glyph-e.webp@@",
 'F':"@@asset:assets/ui/headings/sheet-glyph-f.webp@@",
 'G':"@@asset:assets/ui/headings/sheet-glyph-g.webp@@",
 'H':"@@asset:assets/ui/headings/sheet-glyph-h.webp@@",
 'I':"@@asset:assets/ui/headings/sheet-glyph-i.webp@@",
 'J':"@@asset:assets/ui/headings/sheet-glyph-j.webp@@",
 'K':"@@asset:assets/ui/headings/sheet-glyph-k.webp@@",
 'L':"@@asset:assets/ui/headings/sheet-glyph-l.webp@@",
 'M':"@@asset:assets/ui/headings/sheet-glyph-m.webp@@",
 'N':"@@asset:assets/ui/headings/sheet-glyph-n.webp@@",
 'O':"@@asset:assets/ui/headings/sheet-glyph-o.webp@@",
 'P':"@@asset:assets/ui/headings/sheet-glyph-p.webp@@",
 '%':"@@asset:assets/ui/headings/sheet-glyph-pct.webp@@",
 'Q':"@@asset:assets/ui/headings/sheet-glyph-q.webp@@",
 'R':"@@asset:assets/ui/headings/sheet-glyph-r.webp@@",
 'S':"@@asset:assets/ui/headings/sheet-glyph-s.webp@@",
 'T':"@@asset:assets/ui/headings/sheet-glyph-t.webp@@",
 'U':"@@asset:assets/ui/headings/sheet-glyph-u.webp@@",
 'V':"@@asset:assets/ui/headings/sheet-glyph-v.webp@@",
 'W':"@@asset:assets/ui/headings/sheet-glyph-w.webp@@",
 'X':"@@asset:assets/ui/headings/sheet-glyph-x.webp@@",
 'Y':"@@asset:assets/ui/headings/sheet-glyph-y.webp@@",
 'Z':"@@asset:assets/ui/headings/sheet-glyph-z.webp@@"};
const gap=(a,b)=>{const A=a.getBounds(),B=b.getBounds();return Math.round(B.y-(A.y+A.height))};
const load=async src=>{const img=new Image();img.src=src;await img.decode();return img};
// A title line as lettered pieces: the longest known phrase first, then numbers and capitals from single glyphs; null when a
// word has no lettering (the title is then written in the pen's red).
function pieces(text,end){const w=String(text).split(' ').filter(Boolean),out=[];let i=0;
 while(i<w.length){let hit=0;for(let j=w.length;j>i;j--){const p=w.slice(i,j).join(' ');if((end&&TITLES_END[p])||TITLES[p]){out.push({t:end&&TITLES_END[p]?'end:'+p:p});hit=j;break}}
  if(hit){i=hit;continue}const word=w[i].replace(/[.:]$/,'');if(/^[0-9A-Z%]+$/.test(word)){out.push({g:[...word]});i++;continue}return null}
 return out}
// A game calls once at the end of init: No2Tracing.attach(P,app,hudLayer,{x,y,w,h,quiet:[message,sub]}); then sheet.show(on,end) every
// frame. The message and sub hide while the shell's ready card or pause words are on the sheet; the HUD layer hides with them.
async function attach(P,app,below,rect={}){const tex=P.Texture.from(await load(vellumSrc)),s=new P.Sprite(tex);
 const {x=0,y=0,w=app.screen.width,h=app.screen.height,inset=-4,quiet=[]}=rect;s.position.set(x+inset,y+inset);s.width=w-2*inset;s.height=h-2*inset;s.alpha=0;s.visible=false;s.eventMode='none';
 // Over everything already on the stage, then the layer it sits under (the HUD and its messages) goes back on top.
 const parent=below?.parent||app.stage;parent.addChild(s);if(below)parent.addChild(below);
 const tx={},pending=new Set(),T=async(k,src)=>{tx[k]=P.Texture.from(await load(src))};
 await Promise.all([...Object.entries(TITLES).map(([k,v])=>T(k,v)),...Object.entries(TITLES_END).map(([k,v])=>T('end:'+k,v)),...Object.entries(GLYPHS).map(([k,v])=>T('g:'+k,v)),
  T('key-space',art['key-space']),T('key-wide',art['key-wide']),T('key',art.key),T('xb-a',art['xb-a']),T('ps-cross',art['ps-cross'])]);
 const [msg,sub]=quiet,titleC=new P.Container(),subC=new P.Container();titleC.eventMode=subC.eventMode='none';(below||parent).addChild(titleC,subC);
 const sheet={sprite:s,titleC,subC,on:false,end:false,level:0,show(on,end=false){this.on=!!on;this.end=!!end;return this},
  tick(dt){const want=this.on&&!tracing.shell?1:0;this.level=want>this.level?Math.min(want,this.level+dt/FADE):Math.max(want,this.level-dt/FADE);s.alpha=this.level*VELLUM;s.visible=this.level>0;
   const bw=this.on||tracing.shell?1:0;this.haze=bw>this.haze?Math.min(bw,this.haze+dt/FADE):Math.max(bw,this.haze-dt/FADE);this.diffuse();
   if(this.level>0)tracing.gameSeen=performance.now();for(const q of [...quiet,titleC,subC])q.visible=!tracing.shell;if(below)below.visible=!tracing.shell;this.keys();this.letter()},
  // Prototype (WebGL): real vellum diffuses what lies under it, so the game's layers below the sheet (never the words on it) get a
  // soft GPU blur that fades with the sheet; the shell's own sheet (pause, ready card) blurs the field the same way.
  haze:0,blur:new P.BlurFilter({strength:0,quality:3}),
  diffuse(){const f=this.blur,on=this.haze>0,i=parent.getChildIndex(s);f.strength=HAZE*this.haze*app.renderer.resolution;
   parent.children.forEach((c,j)=>{const has=c.filters?.includes?.(f),want=on&&j<i;if(want===!!has)return;const rest=(c.filters||[]).filter(x=>x!==f);c.filters=want?[...rest,f]:rest.length?rest:null})},
  // The title line as lettered art (the words stay in the Text for the audit and screen readers). In another language the
  // English title's pieces are looked up in that language's lettering (No2TitleL10N, painted per language); textures load on
  // first use, and until they have (or if one is missing) the translated words show in the title font.
  local(){const L=g.No2I18n?.lang||'en';if(L==='en')return null;const src=msg?.__no2Src??msg?.text??'',ps=src&&pieces(src,this.end),map=g.No2TitleL10N?.[L];if(!ps||!map)return null;
   let ready=true;for(const p of ps)if(p.t){const k=L+':'+p.t,u=map[p.t];if(!u)return null;if(!tx[k]){ready=false;if(!pending.has(k)){pending.add(k);load(u).then(im=>{tx[k]=P.Texture.from(im);this.titleKey=''}).catch(()=>{})}}}
   return ready?ps.map(p=>p.t?{t:L+':'+p.t}:p):null},
  letter(){const text=msg?.text||'',key=text+'|'+this.end+'|'+msg?.style.fontSize+'|'+(g.No2I18n?.lang||'en');if(key===this.titleKey)return this.place();this.titleKey=key;titleC.removeChildren().forEach(c=>c.destroy());
   // In another language the lettered English title is not shown; the translated words show until that language's lettering is painted.
   const ps=text&&((g.No2I18n?.lang||'en')==='en'?pieces(text,this.end):this.local());if(msg)msg.alpha=ps?0:1;if(!ps)return;const H=msg.style.fontSize*1.45;let cx=0,tall=H;
   for(const p of ps){if(cx)cx+=H*.22;if(p.t){// A re-cut title (owner 2026-10-28: no cropped swashes) carries where its first, tight 80 px band sits: [x,y,w,h] in image pixels; the letters keep that band's size and place.
      const sp=new P.Sprite(tx[p.t]),tr=/^([a-z]{2}):(.*)$/.exec(p.t),b=tr?null:g.No2SheetBands?.[p.t];let k=H/(b?b[3]:sp.texture.height),y=b?-b[1]*k:0;
      // A translated title is sized so its letters match the English ones (owner 2026-10-30: none too small, none too big),
      // measured by tools/fit-headings-l10n.py; a two-line one stands taller, centred on the line.
      const LT=g.No2TitleLettersL10N,fr=tr&&LT?.[tr[1]]?.[tr[2]];if(fr){k=Math.min((LT.en?.[tr[2]]??LT.ref)*92/80*H/(fr*sp.texture.height),H*2.4/sp.texture.height);y=H/2-sp.texture.height*k/2;tall=Math.max(tall,sp.texture.height*k)}
      sp.scale.set(k);sp.position.set(cx-(b?b[0]*k:0),y);titleC.addChild(sp);cx+=b?b[2]*k:sp.width}
    else for(const ch of p.g){const sp=new P.Sprite(tx['g:'+ch]);sp.scale.set(H*.62/sp.texture.height);sp.position.set(cx,H*.1);titleC.addChild(sp);cx+=sp.width+H*.04}}
   const k=Math.min(1,w*.9/cx);titleC.scale.set(k);titleC.pivot.set(cx/2,H/2);this.titleTall=tall/H;this.place()},
  // One rhythm under every lettered title: the line below starts a gap of 0.6 x the title's cap height (at least one body line)
  // under the title art's ink (the cut-out is tight to its ink); with nothing below, the title stays on the message line.
  place(){if(!msg||!titleC.children.length)return;const H=msg.style.fontSize*1.45*titleC.scale.y,below=subC.children.length?subC:sub?.text?sub:null;let y=msg.y;
   if(below){const b=below.getLocalBounds(),top=below.y+(b.y-(below.pivot?.y||0))*below.scale.y,gap=Math.max(H*.62*.6,(sub.style.fontSize||30)*1.0);y=top-gap-H*(this.titleTall||1)/2}
   titleC.position.set(Math.round(msg.x),Math.round(y));this.gap=below?gap(titleC,below):null},
  // Prompt lines show the real key on a correction-fluid keycap (or the Xbox button): "press [Space] to play again".
  // The initials prompt (owner 2026-10-27) is three lines: "your initials:", the letters on their own line and larger, then the hint.
  keys(){const text=sub?.text||'',pad=g.No2?.deviceMode==='xbox',key=text+'|'+pad+(g.No2PadStyle?.()||'')+'|'+sub?.style.fontSize;if(key!==this.subKey){this.subKey=key;subC.removeChildren().forEach(c=>c.destroy({children:true}));
    const F=sub?.style.fontSize||30,ini=/^your initials:\s+(.+?)(?:\s{3}\((.*)\))?$/.exec(text),rows=ini?[['your initials:',F],[ini[1],F*2],...(ini[2]?[['('+ini[2]+')',F]]:[])]:[[text,F]];
    // The key word in the language shown (owner 2026-10-30: the keycap was lost in translation): Space and Enter and their
    // translations from the language table; A on a controller.
    const T=w=>g.No2I18n?.t?.(w)??w,esc=w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),src=sub?.__no2Src??text;this.spaceW=new Set(['Space',T('Space')]);this.keyW=new Set(['Space','Enter',T('Space'),T('Enter')]);
    this.keyRe=pad?(/\bA\b/.test(src)?/(\bA\b)/:/(\bA\b)(?= to )/):new RegExp('(?<![\\p{L}])('+[...this.keyW].map(esc).join('|')+')(?![\\p{L}])','u');
    const keyed=ini||text.split(this.keyRe).length>1;if(sub)sub.alpha=keyed?0:1;
    if(keyed){let y=0;rows.forEach(([line,size],r)=>{const row=new P.Container(),h=this.row(row,line,size,pad);if(r)y+=h/2;row.position.set(0,Math.round(y));subC.addChild(row);subC.pivot.y=Math.round(row.y/2);y+=h/2+F*.35})}}
   if(sub&&subC.children.length)subC.position.set(Math.round(sub.x),Math.round(sub.y))},
  // One centred line of blue words with the keys on keycaps; returns its height.
  row(c,text,F,pad){const st=sub.style.clone();st.fill=BIC.blue;st.fontSize=F;let cx=0,hh=F*1.5,capped=false;
   for(const part of text.split(this.keyRe||/(\bSpace\b|\bEnter\b)/)){if(!part)continue;if(pad?part==='A':this.keyW?.has(part)){const face=pad?(g.No2PadStyle?.()==='ps'?'ps-cross':'xb-a'):this.spaceW?.has(part)?'key-space':'key-wide',cap=new P.Sprite(tx[face]);capped=true;
     if(pad){cap.scale.set(hh/cap.texture.height);cap.position.set(cx,-hh/2);c.addChild(cap);cx+=cap.width}
     else{const lab=new P.Text({text:part,style:{...st,fill:BIC.black,fontSize:F*.85}});const cw=Math.max(lab.width+hh*.8,this.spaceW?.has(part)?hh*3:hh*1.6);cap.width=cw;cap.height=hh;cap.position.set(cx+F*.15,-hh/2);
      lab.anchor.set(.5);lab.position.set(cx+F*.15+cw/2,-hh*.06);lab.roundPixels=true;c.addChild(cap,lab);cx+=cw+F*.3}}
    else{const t=new P.Text({text:part,style:st});t.roundPixels=true;t.anchor.set(0,.5);t.position.set(cx,0);c.addChild(t);cx+=t.width}}
   c.pivot.set(Math.round(cx/2),0);return capped?hh:F*1.2}};
 // The words, on whole pixels; their paper-coloured edge (kept for banners over live play) is dropped on the sheet.
 for(const q of quiet){q.roundPixels=true;q.style.fill=q===msg?BIC.red:BIC.blue}
 sheet.ink=()=>{if(!sheet.on)return;for(const q of quiet)if(q.style.stroke)q.style.stroke=null};
 // The canvas is drawn at the size it shows on screen (device pixels), so text and lines are never a stretched low-res texture.
 sheet.sharp=()=>{const c=app.canvas,w=c.getBoundingClientRect().width;if(!w)return;const r=Math.max(1,Math.min(3,w/app.screen.width*(devicePixelRatio||1)));
  if(Math.abs(r-app.renderer.resolution)>.02){app.renderer.resolution=r;app.renderer.resize(app.screen.width,app.screen.height);Object.assign(c.style,{width:'100%',height:'100%'})}};
 // After the game's own frame (which may restyle its words) and before the stage is drawn.
 app.ticker.add(t=>{sheet.tick(Math.min(t.deltaMS/1000,.1));sheet.ink();sheet.sharp()},null,-10);return sheet}
// The shell's sheet: a plain element over #game-mount, under the ready card and the pause dialog, faded in CSS.
function shell(on){on=!!on;tracing.shell=on;const mount=document.getElementById('game-mount');if(!mount)return;let el=mount.querySelector(':scope>.tracing-sheet');
 if(!el){if(!on)return;el=document.createElement('div');el.className='tracing-sheet';el.style.backgroundImage='url('+vellumSrc+')';mount.append(el)}
 el.classList.toggle('on',on)}
// The masking tape: one translucent strip lying across the sheet's top edge, slightly off centre, a page element above the notebook
// (never clipped by the canvas or the page edge), placed on the field (--field-* from host.js).
function tape(on){on=!!on;let t=document.querySelector('body>.tracing-tape');if(!t){if(!on)return;t=document.createElement('div');t.className='tracing-tape';t.setAttribute('aria-hidden','true');document.body.append(t)}
 t.classList.toggle('on',on)}
{const root=g.document?.documentElement?.style;root?.setProperty('--tracing-tape','url('+tapeSrc+')');root?.setProperty('--tracing-paused','url('+TITLES.paused+')')}
const tracing={vellum:vellumSrc,tape:tapeSrc,titles:TITLES,titlesEnd:TITLES_END,glyphs:GLYPHS,bic:BIC,opacity:VELLUM,fade:FADE,attach,setShell:shell,setTape:tape,gameSeen:0,shell:false,pieces,
 // Every notebook's play page uses the sheet (host.js and Scribble Defender's page read this as data-tracing).
 variant:()=>g.document?.body?.dataset.notebook?'vellum':''};
g.No2Tracing=tracing;
g.No2UI.glyph=glyph;g.No2UI.button=button;g.No2UIArt=art;
})(globalThis);
