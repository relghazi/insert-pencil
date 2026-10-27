'use strict';
// Home Ec Scramble rule checks: one per 1982 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,BurgerEngine:Engine,colX}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const FY=C.floors,make=(seed=1982)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)},secs=s=>Math.ceil(s/C.step);
 // A quiet kitchen: no enemies coming in unless a test places one.
 const bare=(seed=1982)=>{const e=make(seed);for(const x of e.enemies){x.state='wait';x.timer=1e9}e.events=[];return e};
 const enemy=(e,kind,f,x,i=0)=>{const n=e.enemies[i];Object.assign(n,{kind,state:'walk',x,y:FY[f],dx:1,dy:0,lad:null,stun:0});return n};
 const put=(e,f,x)=>Object.assign(e.chef,{x,y:FY[f],lad:null});
 const piece=(e,b,kind)=>e.pieces.find(p=>p.burger===b&&p.kind===kind);
 const walkOver=pc=>{pc.steps=[1,1,1,0];return pc};
 const settle=e=>{for(let i=0;i<secs(4)&&e.pieces.some(p=>p.state==='fall');i++)e.updatePieces(C.step,false)};
 const kick=(e,pc)=>{e.release(pc);settle(e)};
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<6000;i++){const inp={axis:Math.sin(i/70),axisY:Math.cos(i/50),fire:i%300<2};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('stage 1: four burgers of four ingredients, buns on the top floor, five pepper, three lives',()=>{const e=make();assert.equal(e.pieces.length,16);assert.equal(e.pieces.filter(p=>p.kind==='top'&&p.floor===0).length,4);
  assert.equal(e.pepper,5);assert.equal(e.lives,3);assert.equal(e.chef.y,FY[5],'chef starts on the bottom floor')});
 test('the chef walks the girders and climbs only at ladders',()=>{const e=bare();put(e,5,colX(4));step(e,60,{up:true});assert.equal(e.chef.y,FY[5],'no ladder here');
  put(e,5,colX(1)+6);let n=0;while(e.chef.y!==FY[4]&&n<secs(2)){step(e,1,{up:true});n++}assert.equal(e.chef.x,colX(1),'snapped to the ladder');assert.ok(n<secs(1),'climbed one floor');
  put(e,1,colX(13));step(e,secs(2),{right:true});assert.equal(e.chef.x,colX(14),'stops at the girder end')});
 test('walking over all four quarters drops an ingredient one floor for 50',()=>{const e=bare();const pc=piece(e,0,'patty');put(e,3,pc.x+4);let n=0;while(pc.state==='rest'&&n<secs(2)){step(e,1,{right:true});n++}
  assert.equal(pc.state,'fall');assert.ok(pc.steps.every(s=>!s));assert.equal(e.score,0);settle(e);assert.equal(pc.floor,4,'one floor down');assert.equal(e.score,50);assert.equal(pc.state,'rest')});
 test('a falling ingredient knocks the one below it down too',()=>{const e=bare();const lt=piece(e,1,'lettuce'),pt=piece(e,1,'patty');kick(e,lt);
  assert.equal(lt.floor,2,'lettuce one floor');kick(e,lt);assert.equal(lt.floor,3,'lettuce stops where the patty was');assert.equal(pt.floor,4,'patty knocked down');assert.equal(piece(e,1,'bottom').floor,5,'and the bun under it');assert.equal(e.score,200)});
 test('the bottom floor drops onto the plate and burgers stack there',()=>{const e=bare();const bt=piece(e,0,'bottom');kick(e,bt);assert.equal(bt.state,'plate');assert.equal(bt.y,C.plateY);assert.equal(e.stacks[0],1);
  const pt=piece(e,0,'patty');kick(e,pt);kick(e,pt);kick(e,pt);assert.equal(pt.state,'plate');assert.equal(pt.y,C.plateY-C.stackStep,'stacked on top')});
 test('completing every burger clears the stage and gives a pepper; stage 2 brings cheese and tomato; three hot dogs and an egg until stage 3 brings six with pickles',()=>{const e=bare();const pp=e.pepper;for(const p of e.pieces){p.state='plate'}e.events=[];step(e,1);assert.equal(e.state,'cleared');assert.equal(e.pepper,pp+1,'bonus pepper');step(e,secs(C.clearPause)+2);
  assert.equal(e.stage,2);assert.ok(e.pieces.some(p=>p.kind==='cheese')&&e.pieces.some(p=>p.kind==='tomato'));assert.equal(e.enemies.map(x=>x.kind).sort().join(),'egg,hotdog,hotdog,hotdog');assert.equal(e.score,0);
  e.newStage();assert.equal(e.stage,3);assert.equal(e.enemies.length,6);assert.ok(e.enemies.some(x=>x.kind==='pickle'),'pickles');e.newStage();assert.equal(e.enemies.length,6)});
 test('crushing under an ingredient: hot dog 100, pickle 200, egg 300',()=>{const pts=['hotdog','pickle','egg'].map(k=>{const e=bare();const pc=piece(e,0,'patty');enemy(e,k,4,pc.x+40);kick(e,pc);return e.score-50});assert.equal(pts.join(),'100,200,300');
  const e=bare();const pc=piece(e,0,'patty');const n=enemy(e,'hotdog',4,pc.x+40);kick(e,pc);assert.equal(n.state,'wait','crushed enemy leaves')});
 test('enemies riding an ingredient: 500 for one, 1000 for two, and one extra floor each',()=>{const e=bare();const pc=piece(e,2,'lettuce');enemy(e,'hotdog',2,pc.x+30,0);e.release(pc);assert.equal(pc.drops,2);settle(e);
  assert.equal(pc.floor,4,'two floors');assert.equal(e.events.find(x=>x.type==='carry').points,500);const f=bare();const q=piece(f,3,'top');enemy(f,'hotdog',0,q.x+20,0);enemy(f,'egg',0,q.x+90,1);f.release(q);settle(f);
  const carry=f.events.find(x=>x.type==='carry');assert.equal(carry.points,1000);assert.equal(C.carry.join(),'500,1000,2000,4000,8000,16000')});
 test('pepper stuns an enemy and the chef walks through it; pepper runs out',()=>{const e=bare();put(e,5,colX(10));e.chef.face=1;const n=enemy(e,'hotdog',5,colX(10)+60);n.dx=-1;step(e,1,{fire:true});assert.equal(e.pepper,4);step(e,5,{});
  assert.ok(n.stun>0,'stunned');step(e,secs(1),{right:true});assert.equal(e.state,'play','walked through');assert.equal(e.lives,3);
  e.pepper=0;e.cloud=null;step(e,1,{});step(e,1,{fire:true});assert.equal(e.cloud,null,'no pepper left')});
 test('enemies chase the chef up and down the ladders and cost a life on contact',()=>{const e=bare();put(e,5,colX(12));const n=enemy(e,'egg',0,colX(4));let t=0;while(e.state==='play'&&t<secs(40)){step(e,1);t++}
  assert.equal(e.lives,2,'caught');assert.equal(e.state,'dead');step(e,secs(C.deathPause)+2);assert.equal(e.state,'play');assert.equal(e.chef.y,FY[5])});
 test('crushed and carried enemies come back in from the girder ends',()=>{const e=bare();const n=enemy(e,'hotdog',4,piece(e,1,'patty').x+40);kick(e,piece(e,1,'patty'));assert.equal(n.state,'wait');step(e,secs(C.respawn)+2);
  assert.equal(n.state,'walk');assert.ok(e.layout.floors[FY.indexOf(n.y)].some(([a,b])=>Math.abs(n.x-colX(a))<4||Math.abs(n.x-colX(b))<4),'at a girder end')});
 test('bonus food when the 4th, 8th and 12th ingredient reaches its plate: ice cream 500 plus a pepper; coffee 1,000 on stage 2',()=>{const e=bare();e.dropped=3;e.bonusCheck();assert.equal(e.bonus,null);e.dropped=4;e.bonusCheck();assert.equal(e.bonus.kind,'icecream');
  put(e,e.layout.bonusAt[0],e.bonus.x-10);step(e,1);assert.equal(e.score,500);assert.equal(e.pepper,6);const f=bare();f.stage=1;f.newStage();f.dropped=5;f.bonusCheck();assert.equal(f.bonus.points,1000);
  const g=bare(),plate=pc=>{for(let i=0;i<6&&pc.state!=='plate';i++)kick(g,pc)};for(let b=0;b<3;b++)plate(piece(g,b,'bottom'));assert.equal(g.bonus,null);plate(piece(g,3,'bottom'));assert.equal(g.dropped,4);assert.equal(g.bonus.kind,'icecream','counted on the plates')});
 test('a newly arrived enemy can be walked through for a quarter second',()=>{const e=bare();const n=e.enemies[0];n.timer=0;step(e,1);assert.equal(n.state,'walk');put(e,FY.indexOf(n.y),n.x);step(e,1);assert.equal(e.state,'play','grace');for(let i=0;i<secs(.3)&&e.state==='play';i++){Object.assign(e.chef,{x:n.x,y:n.y});e.step(C.step,{})}assert.equal(e.state,'dead')});
 test('once the last ingredient is falling the chef cannot be caught',()=>{const e=bare();for(const p of e.pieces)p.state='plate';const last=e.pieces[0];last.state='fall';put(e,5,colX(10));const n=enemy(e,'hotdog',5,colX(10));n.dx=0;e.collide();assert.equal(e.state,'play');last.state='rest';e.collide();assert.equal(e.state,'dead')});
 test('an extra life every 20,000; the last life lost ends the game',()=>{const e=bare();e.award(19990);assert.equal(e.lives,3);e.award(20);assert.equal(e.lives,4);e.award(20000);assert.equal(e.lives,5,'every 20,000');e.lives=1;e.die();assert.equal(e.state,'end')});
 test('the demo pilot scores, finishes the first stage and keeps a life',()=>{const e=make(3);for(let i=0;i<120*240&&e.state!=='end';i++)e.step(C.step,e.pilot());assert.ok(e.score>=5000,'score '+e.score);assert.ok(e.stage>=2,'stage '+e.stage);assert.ok(e.state!=='end','game over')});
 return count}
g.BurgerTests={run};if(typeof module!=='undefined')module.exports=g.BurgerTests;
})(globalThis);
