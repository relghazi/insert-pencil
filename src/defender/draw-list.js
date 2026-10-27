
'use strict';
// Pure draw list: the WebGL renderer and offline raster QA consume the same scene.
(()=>{const {CONFIG:C,wrap,delta}=ScribbleCore,W=C.width,H=C.height;
function pageRect(v,focus=false){const w=Math.min(v.width*(focus?.98:.92),v.height*(focus?.91:.84)*W/H);return{x:(v.width-w)/2,y:v.height*(focus?.01:.05),w,h:w*H/W}}
function inkRect(p){return{x:p.x+p.w*.065,y:p.y+p.h*.025,w:p.w*.91,h:p.h*.91}}
function physical(v,page,nav=[]){const w=v.width,h=v.height,out=[];const put=(id,x,y,width,rot=0,layer='props')=>{out.push({id,x,y,w:width,rotation:rot,layer})};
// Desk is the only cover-cropped image. Objects have one uniform scale.
put('desk',w/2,h/2,Math.max(w,h*4096/2560),0,'desk');
put('pencil-yellow',w*.16,h*.022,Math.min(w*.28,520),-.13);put('pencil-chewed',w*.85,h*.94,Math.min(w*.18,340),.2);put('mechanical-pencil',w*.985,h*.3,Math.min(h*.45,520),1.67);put('ballpoint',w*.019,h*.55,Math.min(h*.4,430),-1.67);put('pencil-tin',w*.945,h*.065,Math.min(w*.16,280),.18);put('eraser',w*.065,h*.90,Math.min(w*.065,130),-.2);put('ruler',w*.72,h*.985,Math.min(w*.26,510),-.04);put('highlighter',w*.04,h*.15,Math.min(w*.13,210),-.8);put('whiteout',w*.95,h*.8,Math.min(w*.06,110),.2);
// Decals live in the exposed desk strips, not hidden under the notebook.
for(const [i,id]of ['sam','class98','tallies','heart','tic-tac-toe','arrow'].entries())put('carving-'+id,w*(i<3?.018:.982),h*(.25+(i%3)*.23),Math.min((w-page.w)/2*.7,100),i<3?-.15:.12,'desk');
put('page-edges',page.x+page.w/2+3,page.y+page.h/2+5,page.w,0,'notebook');put('single-page',page.x+page.w/2,page.y+page.h/2,page.w,0,'notebook');put('spiral',page.x+6,page.y+page.h/2,page.h*128/1664,0,'notebook');
for(const n of nav)if(n.id==='settings-open'||n.id==='help'){const id=n.id==='settings-open'?'folded-note':'index-card';put(id,n.x+n.w/2,n.y+n.h/2,n.w,n.rotation||0)}
return out}
function draw(e,meta={}){const out=[],texts=[],terrain=[];let textCount=0;
const sprite=(id,x,y,w,frame=0,extra={})=>out.push({id,x,y,w,frame,...extra});
const text=(text,x,y,size=18,extra={})=>{texts.push({key:extra.key||'t'+textCount++,text:String(text),x,y,size,font:'Schoolhand',color:'#234c70',...extra})};
text('score',34,30,18,{key:'score-label'});text(String(e.score).padStart(6,'0'),34,90,39,{key:'score',bold:true});text('best '+(meta.best||0),34,123,16,{key:'best'});
text('wave '+e.wave,1110,35,25,{key:'wave'});
for(let i=0;i<Math.min(e.lives,6);i++)sprite('radar-ship',1130+i*39,68,29);for(let i=0;i<Math.min(e.bombs,6);i++)sprite('radar-bomb',1130+i*39,104,21);
text('×'+e.lives,1382,75,19,{key:'lives',align:'right'});text('×'+e.bombs,1382,111,19,{key:'bombs',align:'right'});
if(e.feelScene){for(let i=0;i<Math.ceil(C.world/200);i++){const wx=i*200,x=e.sx(wx);if(x>=25&&x<W-25){sprite('laser-ink',x,650,2,0,{height:18,rotation:Math.PI/2});text(i*200+'',x,682,14,{align:'center',key:'marker'+i})}}text('thrust, let go, reverse. repeat.',38,734,18,{key:'feel'});text(Math.round(Math.abs(e.p.vx))+' px/s',1050,734,18,{key:'speed'})}
if(e.planet){for(let x=20;x<W-20;x+=20)terrain.push({x,y:e.terrain(wrap(e.cam+x-W/2))});for(let i=0;i<Math.ceil(C.world/1900);i++){const wx=i*1900+780,x=e.sx(wx);if(x>80&&x<W-80){const id=['school','water-tower','basketball-hoop','trees'][i%4];sprite(id,x,e.terrain(wx),id==='school'?105:60)}}}else sprite('planet-out',W/2,655,W-50,Math.min(11,Math.floor((C.planetEffect-e.planetFx)*18)));
for(const h of e.humans)if(h.state!=='dead'&&e.onScreen(h.x,0)){const type=h.state==='abducted'?'struggle':h.state==='falling'?'fall':'walk',id='teen-'+String(h.variant).padStart(2,'0')+'-'+type;sprite(id,e.sx(h.x),h.y+C.humanFeet,30,Math.floor(e.clock*(type==='walk'?7:10)));}
for(const n of e.enemies)if(!n.dead&&e.onScreen(n.x,0)){const type=n.spawn>0?'materialize':'idle',id=n.type+'-'+type;sprite(id,e.sx(n.x),n.y,n.type==='swarmer'?46: n.type==='baiter'?112:96,Math.floor(n.spawn>0?Math.max(0,C.spawnSeconds-n.spawn)*12:e.clock*10+n.id));if(n.human)for(let j=0;j<4;j++){sprite('laser-ink',e.sx(n.x)-15, n.y+20+j*9,4,0,{height:2});sprite('laser-ink',e.sx(n.x)+15,n.y+20+j*9,4,0,{height:2})}}
for(const b of e.bullets)if(e.onScreen(b.x))sprite('enemy-bullet',e.sx(b.x),b.y,13,Math.floor(e.clock*12));for(const m of e.mines)if(e.onScreen(m.x))sprite('mine',e.sx(m.x),m.y,24,Math.floor(e.clock*6));
for(const b of e.lasers){const a=Math.max(20,Math.min(W-20,e.sx(b.start))),z=Math.max(20,Math.min(W-20,e.sx(b.x))),w=Math.abs(z-a),alpha=b.active?1:Math.max(0,b.fade/.12);for(const id of ['laser-glow','laser-ink'])sprite(id,(a+z)/2,b.y,w,0,{height:id==='laser-ink'?3:8,alpha})}
if(e.state!=='death'&&e.state!=='end'&&e.warpTime<=0){const turn=meta.reverseAge<.25;const id=turn?'player-reverse':'player-idle';sprite(id,e.sx(e.p.x),e.p.y,170,Math.floor(turn?meta.reverseAge*24:e.clock*10),{flip:turn?meta.reverseFrom<0:e.p.dir<0,alpha:e.invul>0&&Math.floor(e.clock*13)%2?.4:1});if(e.p.thrusting)sprite('player-thrust',e.sx(e.p.x)-e.p.dir*44,e.p.y,40,Math.floor(e.clock*14),{flip:e.p.dir<0})}
for(const fx of meta.effects||[])sprite(fx.id,e.sx(fx.x),fx.y,fx.w||100,Math.floor(fx.age*fx.fps),{alpha:Math.min(1,(fx.duration-fx.age)*4)});
if(e.state==='death')sprite('player-explosion',e.sx(e.p.x),e.p.y,160,Math.min(11,Math.floor((C.deathPause-e.deathTimer)*20)));
if(e.bombFx>0){const age=.65-e.bombFx,id=age<.32?'smart-sweep':'whiteout-wipe';sprite(id,W/2,H/2,W,Math.min(7,Math.floor((age% .32)*24)),{height:H})}
// Register score popups with deterministic nonoverlapping label placement.
for(const p of e.popups.filter(p=>!p.comic&&e.onScreen(p.x)).slice(-8)){const x=Math.max(45,Math.min(W-110,e.sx(p.x))),y=Math.max(190,Math.min(615,p.y-22));text(p.text,x,y,17,{key:'popup'+textCount,alpha:Math.min(1,p.t*2),floating:true})}
if(e.state==='tally'){sprite('wave-clear',W/2,270,620);text('wave '+e.wave,W/2,340,27,{key:'tally-wave',align:'center'});if(e.tally.time>.5)text(e.tally.survivors+' × 100 × '+Math.min(e.wave,5),W/2,389,25,{key:'tally-count',align:'center'});if(e.tally.time>1)text('= '+e.tally.bonus,W/2,437,30,{key:'tally-total',align:'center'});if(e.tally.time>1.8)text('A+ obviously.',W/2,493,22,{key:'tally-grade',align:'center'})}
if(meta.mode==='demo')text('demo · press anything to take over',W/2,751,20,{key:'demo',align:'center'});else if(!e.feelScene&&e.wave===1&&e.waveTime<10)text('fly: WASD / arrows     fire: Space     bomb: B     warp: H     pause: P',W/2,756,16,{key:'hints',align:'center'});
if(meta.toast&&meta.toastTime>0&&e.state!=='tally'&&!(e.wave===1&&e.waveTime<10)&&!e.feelScene){if(meta.toast==='MUTANT PLANET')sprite('mutant-warning',W/2,738,380);else text(meta.toast,40,752,17,{key:'toast'})}if(meta.debug)text(Math.round(meta.fps||60)+' fps',1390,766,14,{key:'fps',align:'right'});
return{sprites:out,texts,terrain}}
function scanner(e,pageWidth){const x=420,y=6,w=650,h=102,size=Math.max(22,14*W/Math.max(pageWidth,1)),items=[],line=[];const rx=v=>x+w/2+delta(v,e.p.x)/C.world*(w-20),ry=v=>y+10+(v-C.top)/(C.ground-C.top)*(h-20);
if(e.planet)for(let i=0;i<=100;i++)line.push([x+10+i/100*(w-20),ry(e.terrain(e.p.x+(i/100-.5)*C.world))]);for(const n of e.enemies)if(!n.dead)items.push({id:'radar-'+n.type,x:rx(n.x),y:ry(n.y),w:size});for(const n of e.humans)if(n.state!=='dead'&&(n.state!=='abducted'||Math.floor(e.clock*8)%2))items.push({id:'radar-human',x:rx(n.x),y:ry(n.y),w:size*.85});items.push({id:'radar-ship',x:x+w/2,y:ry(e.p.y),w:size*1.5});return{x,y,w,h,size,items,line}}
globalThis.ScribbleScene={pageRect,inkRect,physical,draw,scanner};if(typeof module!=='undefined')module.exports=globalThis.ScribbleScene;
})();





