'use strict';
// Quiz rule checks: one per 1981 Qix cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,QixEngine:Engine,idx,col,row,DX,DY}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const R=0,D=1,L=2,U=3,X=C.cols,Y=C.rows,interior=(X-2)*(Y-2),pts=(cells,slow)=>Math.round(cells*100/interior*(slow?500:250));
 const make=(seed=1981)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 // A quiet field: no Sparx, and the Qix held still where it is put (it still kills what it touches).
 const still=e=>{e.moveQix=q=>{if(e.drawing&&e.qixCells(q).some(i=>e.stix[i]))e.die('qix')};return e};
 const bare=(seed=1981,qx=800,qy=400)=>{const e=still(make(seed));e.sparx=[];e.nextSparx=1e9;e.qix=[e.makeQix(qx,qy)];e.events=[];return e};
 const at=(e,c,r)=>{e.marker.c=idx(c,r);e.marker.prog=0};
 // Holds a direction (plus buttons) until the marker has gone n cells that way or stopped.
 const walk=(e,d,n,inp={})=>{let k=0;for(;k<n;k++){const t=e.nb(e.marker.c,d);let s=0;while(e.marker.c!==t&&e.state==='play'&&s++<60)e.step(C.step,{axis:DX[d],axisY:DY[d],...inp});if(e.marker.c!==t)break}return k};
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<6000;i++){const inp={axis:Math.sin(i/70),axisY:Math.cos(i/90),fast:i%300<200,slow:i%500>400};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('an empty field inside the frame, the marker on the bottom edge, two Sparx at the top and one Qix',()=>{const e=make();assert.equal(e.percent,0);assert.equal(row(e.marker.c),Y-1);assert.ok(e.border[e.marker.c]);
  assert.equal(e.sparx.length,2);assert.ok(e.sparx.every(s=>row(s.c)===0),'top');assert.ok(e.sparx[0].dir!==e.sparx[1].dir,'opposite ways');assert.equal(e.qix.length,1);assert.ok(e.qixCells(e.qix[0]).every(i=>!e.v[i]),'qix in the open')});
 test('without a draw button the marker only runs along the border',()=>{const e=bare(),s=e.marker.c;walk(e,U,20);assert.equal(e.marker.c,s,'cannot leave the border');assert.equal(walk(e,R,20),20);assert.equal(row(e.marker.c),Y-1)});
 test('holding a draw button draws Stix into the field; letting go stops the marker',()=>{const e=bare();walk(e,U,30,{fast:true});assert.ok(e.drawing);assert.equal(e.drawing.cells.length,30);
  const c=e.marker.c;step(e,60,{axisY:-1});assert.equal(e.marker.c,c,'stopped')});
 test('closing a shape claims the side without the Qix, one point per cell when drawn fast',()=>{const e=bare();at(e,60,Y-1);walk(e,U,Y-1,{fast:true});assert.ok(!e.drawing,'closed');
  const cells=59*(Y-2)+(Y-2);assert.equal(e.score,pts(cells),'250 a percent');assert.equal(e.v[idx(30,80)],2,'left claimed');assert.equal(e.v[idx(200,80)],0,'qix side open');assert.equal(e.percent,Math.floor(cells*100/interior));assert.ok(e.border[e.marker.c])});
 test('a slow-drawn shape scores double; pressing fast on the way makes it a fast one',()=>{const e=bare();at(e,60,Y-1);walk(e,U,Y-1,{slow:true});assert.equal(e.score,pts(60*(Y-2),true));assert.equal(e.v[idx(30,80)],3,'slow colour');
  const f=bare();at(f,60,Y-1);walk(f,U,40,{slow:true});walk(f,U,Y,{fast:true});assert.equal(f.score,pts(60*(Y-2)))});
 test('slow draw moves at half speed',()=>{const a=bare(),b=bare();step(a,120,{axisY:-1,fast:true});step(b,120,{axisY:-1,slow:true});const da=Y-1-row(a.marker.c),db=Y-1-row(b.marker.c);assert.ok(Math.abs(da-2*db)<=2,da+' vs '+db)});
 test('the line may not cross or touch itself',()=>{const e=bare();walk(e,U,10,{fast:true});walk(e,R,1,{fast:true});const c=e.marker.c;assert.equal(walk(e,D,3,{fast:true}),0);assert.equal(e.marker.c,c);assert.equal(walk(e,L,1,{fast:true}),0)});
 test('the Qix touching the unfinished line kills; the line is erased and the marker goes back to its start',()=>{const e=bare(1981,500,300),s=e.marker.c;walk(e,U,60,{fast:true});const x=Core.px(e.marker.c);e.qix[0].a={x:x-40,y:600};e.qix[0].b={x:x+40,y:600};step(e,1);
  assert.equal(e.state,'dead');assert.equal(e.lives,2);step(e,Math.ceil(C.deathPause/C.step)+2);assert.equal(e.marker.c,s,'back at start');assert.ok(e.stix.every(v=>!v),'line erased');assert.equal(e.drawing,null)});
 test('the Qix wanders the open field and never crosses claimed area',()=>{const e=make(5);e.sparx=[];e.nextSparx=1e9;at(e,90,Y-1);walk(e,U,Y-1,{fast:true});let ok=true,moved=0;const q=e.qix[0],x0=q.a.x;
  for(let i=0;i<3000&&e.state==='play';i++){e.step(C.step,{});if(e.qixCells(q).some(i=>e.v[i]))ok=false;moved=Math.max(moved,Math.abs(q.a.x-x0))}assert.ok(ok,'crossed');assert.ok(moved>100,'moved '+moved)});
 test('Sparx run along the border and kill the marker on contact, but cannot follow the line',()=>{const e=bare();e.sparx=[e.makeSparx(idx(100,Y-1),0,1)];walk(e,U,20,{fast:true});let past=false;for(let i=0;i<300&&e.state==='play';i++){e.step(C.step,{});past=past||col(e.sparx[0].c)>125}assert.ok(past,'went past the start');assert.ok(!e.events.some(v=>v.cause==='sparx'),'safe on the line');
  const f=bare();f.sparx=[f.makeSparx(idx(60,Y-1),0,1)];step(f,300);assert.equal(f.state,'dead');assert.ok(f.events.some(v=>v.type==='death'&&v.cause==='sparx'))});
 test('two more Sparx join when the 37 second time line runs out, and then all turn into Super Sparx that chase out along the line',()=>{assert.equal(C.sparxEvery,37);assert.equal(C.superAfter,74);const e=make();e.qix=[e.makeQix(800,200)];still(e);e.collide=()=>{};
  step(e,Math.ceil(C.sparxEvery/C.step)-2);assert.equal(e.sparx.length,2,'two to start');step(e,4);assert.equal(e.sparx.length,4,'two more at once');assert.ok(!e.sparx.some(s=>s.super));
  const f=bare();walk(f,U,40,{fast:true});f.sparx=[f.makeSparx(f.drawing.start,0,1)];f.levelClock=f.superAfter()-.01;f.nextSparx=1e9;let t=0;while(f.state==='play'&&t++<600)f.step(C.step,{});
  assert.ok(f.sparx[0].super,'super');assert.equal(f.state,'dead');assert.ok(f.events.some(v=>v.cause==='sparx'),'caught on the line')});
 test('stopping while drawing lights the Fuse, which burns along the line to the marker; moving again stops it and stopping again burns on from there',()=>{const e=bare();walk(e,U,30,{fast:true});step(e,Math.ceil(C.fuseDelay/C.step)+2);assert.ok(e.fuse,'lit');
  step(e,60);const k=e.fuse.k;assert.ok(k>0,'burning');walk(e,U,1,{fast:true});assert.equal(e.fuse,null,'out');step(e,Math.ceil(C.fuseDelay/C.step)+2);assert.ok(e.fuse.k>=k,'burns on from where it stopped, not from the start');let t=0;while(e.state==='play'&&t++<2000)e.step(C.step,{});assert.equal(e.state,'dead');assert.ok(e.events.some(v=>v.cause==='fuse'))});
 test('claiming 75 percent clears the level with 1,000 for each percent over',()=>{const e=bare(1981,950,400);for(let r=1;r<Y-1;r++)for(let c=1;c<=170;c++)e.v[idx(c,r)]=2;e.claimed=170*(Y-2);e.computeBorder();at(e,200,Y-1);walk(e,U,Y-1,{fast:true});
  const cells=30*(Y-2),pct=Math.floor((e.claimed)*100/interior);assert.ok(pct>=75,'pct '+pct);assert.equal(e.state,'cleared');assert.equal(e.score,pts(cells)+(pct-75)*1000);step(e,Math.ceil(C.levelDelay/C.step)+2);assert.equal(e.level,2);assert.equal(e.percent,0)});
 test('two Qix from level 3; splitting them ends the level and doubles every later shape, up to x9',()=>{const e=bare();e.level=2;e.newLevel();e.sparx=[];e.nextSparx=1e9;assert.equal(e.qix.length,2);at(e,120,Y-1);walk(e,U,Y-1,{fast:true});
  assert.ok(e.events.some(v=>v.type==='split'));assert.equal(e.state,'cleared');assert.equal(e.multiplier,2);assert.equal(e.score,pts(Y-2),'only the line, no percentage bonus');step(e,Math.ceil(C.levelDelay/C.step)+2);assert.equal(e.level,4);
  e.sparx=[];e.nextSparx=1e9;still(e);e.qix=[e.makeQix(800,400),e.makeQix(900,400)];const s0=e.score;at(e,60,Y-1);walk(e,U,Y-1,{fast:true});assert.equal(e.score-s0,2*pts(60*(Y-2)));
  const f=bare();f.level=2;f.newLevel();f.multiplier=9;f.sparx=[];f.nextSparx=1e9;still(f);f.qix=[f.makeQix(300,400),f.makeQix(800,400)];at(f,120,Y-1);walk(f,U,Y-1,{fast:true});assert.ok(f.events.some(v=>v.type==='split'));assert.equal(f.multiplier,9,'x9 at most')});
 test('three lives, no extra lives, and the game ends with the last one',()=>{const e=bare();assert.equal(e.lives,3);e.award(1e6);assert.equal(e.lives,3);e.lives=1;e.die('qix');assert.equal(e.state,'end')});
 test('the demo pilot scores, clears the first level and keeps a life, but plays like a human and not forever',()=>{const e=make(3);for(let i=0;i<120*120;i++)e.step(C.step,e.pilot());assert.ok(e.score>=20000,'score '+e.score);assert.ok(e.level>=2,'level '+e.level);assert.ok(e.state!=='end','game over');
  for(let i=0;i<120*480&&e.state!=='end';i++)e.step(C.step,e.pilot());assert.ok(e.state==='end','still going after ten minutes, score '+e.score)});
 return count}
g.QuizTests={run};if(typeof module!=='undefined')module.exports=g.QuizTests;
})(globalThis);
