'use strict';
// Galgebra rule checks: one per 1979 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,GalaxianEngine:Engine}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const make=(seed=1979)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 const calm=e=>{e.launchTimer=1e9;e.swayDir=0;e.events=[];return e};
 const only=(e,keep)=>{for(const a of e.aliens)a.alive=keep(a);return e};
 const of=(e,type)=>e.aliens.find(a=>a.alive&&a.type===type);
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<6000;i++){const inp={axis:Math.sin(i/70),fire:i%50<3};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('the formation is 46 aliens: 2 flagships, 6 red, 8 purple and 30 blue',()=>{const e=make(),n=t=>e.aliens.filter(a=>a.type===t).length;assert.equal(e.aliens.length,46);assert.equal([n('flag'),n('red'),n('purple'),n('blue')].join(),'2,6,8,30')});
 test('the formation sways side to side and never comes down',()=>{const e=make();e.launchTimer=1e9;const a=e.aliens[10],x=a.x,y=a.y;step(e,240);assert.ok(Math.abs(a.x-x)>10,'swayed');assert.equal(a.y,y);step(e,1200);assert.equal(a.y,y);assert.ok(Math.abs(e.sway)<=C.swayMax)});
 test('one missile in the air at a time, one per press',()=>{const e=calm(make());step(e,1,{fire:true});assert.ok(e.shot);step(e,5,{fire:true});step(e,1,{});step(e,1,{fire:true});assert.equal(e.shots,1,'no second missile while one flies')});
 test('aliens in formation score 30, 40, 50 and 60',()=>{const pts=['blue','purple','red','flag'].map(t=>{const e=calm(make());only(e,a=>a.type===t);const a=of(e,t);e.player.x=a.x;step(e,1,{fire:true});step(e,90);return e.score});assert.equal(pts.join(),'30,40,50,60')});
 test('diving aliens score double: blue 60, purple 80, red 100',()=>{const pts=['blue','purple','red'].map(t=>{const e=calm(make());const a=of(e,t);e.startDive(a,1);return e.kill(a)});assert.equal(pts.join(),'60,80,100')});
 test('aliens peel off the ends of the formation to attack',()=>{const e=calm(make());e.launchSingle();const d=e.aliens.filter(a=>a.state==='dive');assert.equal(d.length,1);const a=d[0],row=e.aliens.filter(b=>b.row===a.row).map(b=>b.col);assert.ok(a.col===Math.min(...row)||a.col===Math.max(...row),'end of row')});
 test('a flagship dives with up to two red escorts',()=>{const e=calm(make());e.launchFlag();const f=e.aliens.find(a=>a.type==='flag'&&a.state==='dive');assert.ok(f,'flagship dives');assert.equal(f.escorts.length,2);for(const id of f.escorts){assert.equal(e.aliens[id].type,'red');assert.equal(e.aliens[id].leader,f.id)}});
 test('flagship scoring: 150 alone, 200 with one escort, 300 with two, 800 after both escorts',()=>{const pts=[0,1,2,'both'].map(k=>{const e=calm(make()),reds=k==='both'?2:k;let n=0;only(e,a=>a.type!=='red'||n++<reds);e.launchFlag();
   const f=e.aliens.find(a=>a.type==='flag'&&a.state==='dive');assert.equal(f.escorts.length,reds);if(k==='both')for(const id of f.escorts)e.kill(e.aliens[id]);return e.kill(f)});
  assert.equal(pts.join(),'150,200,300,800')});
 test('a flagship that flew off and comes back alone scores 150',()=>{const e=calm(make());const f=of(e,'flag');e.startDive(f,1);f.escorts=[2,3];f.escortsKilled=0;f.t=5;f.fireAt=[];f.y=768+40;step(e,1);assert.equal(f.state,'return');assert.equal(e.kill(f),150)});
 test('divers drop shots on the way down',()=>{const e=calm(make());const a=of(e,'blue');e.startDive(a,1);let n=0;while(!e.events.some(v=>v.type==='bomb')&&n<1200){e.player.x=a.x<512?984:40;step(e,1);n++}assert.ok(e.events.some(v=>v.type==='bomb'),'fired')});
 test('a diver that misses leaves the bottom, re-enters from the top and rejoins its place',()=>{const e=calm(make());const a=of(e,'blue');e.startDive(a,1);let seen=false,n=0;while(a.state!=='form'&&n<3000){e.player.x=a.x<512?984:40;e.bullets=[];step(e,1);if(a.state==='return')seen=true;n++}
  assert.ok(seen,'returned');assert.equal(a.state,'form');assert.ok(a.alive);assert.equal(e.lives,C.lives)});
 test('a shot or a collision costs a life; the third ends the game',()=>{const e=calm(make());e.bullets=[{x:e.player.x,y:C.playerY-30,vx:0}];step(e,30);assert.equal(e.lives,2);
  e.state='play';const a=of(e,'purple');e.startDive(a,1);a.t=5;a.fireAt=[];a.x=e.player.x;a.y=C.playerY-10;const s=e.score;step(e,1);assert.equal(e.lives,1);assert.ok(!a.alive,'alien destroyed');assert.equal(e.score,s);
  e.state='play';e.bullets=[{x:e.player.x,y:C.playerY-30,vx:0}];step(e,30);assert.equal(e.lives,0);assert.equal(e.state,'end')});
 test('after a loss the attackers fly on and regroup before the next rocket appears',()=>{const e=calm(make());const a=of(e,'blue');e.startDive(a,1);step(e,120);const y=a.y;e.bullets=[{x:e.player.x,y:C.playerY-30,vx:0}];step(e,30);assert.equal(e.state,'dead');assert.ok(a.state==='dive'&&a.y>y,'still diving');let n=0;while(e.state==='dead'&&n<120*20){step(e,1);n++;if(e.state==='dead'&&n>C.deathPause/C.step)assert.ok(e.alive().some(b=>b.state!=='form'),'waits for the formation')}assert.equal(e.state,'play');assert.equal(a.state,'form')});
 test('an extra life at 7,000 points, once',()=>{const e=make();e.award(6990);assert.equal(e.lives,3);e.award(20);assert.equal(e.lives,4);e.award(20000);assert.equal(e.lives,4)});
 test('a cleared wave brings a full formation that attacks sooner',()=>{const e=calm(make());const i1=e.attackInterval();only(e,()=>false);step(e,2);assert.equal(e.state,'cleared');step(e,Math.ceil(C.waveDelay/C.step)+2);assert.equal(e.wave,2);assert.equal(e.alive().length,46);assert.ok(e.attackInterval()<i1,'faster');assert.equal(e.base,3)});
 test('the cabinet\'s attack clock: about one alien every 1.9 s on wave 1, more often every 20 s of a wave, less after a lost ship; a cap on single attackers',()=>{const e=make();assert.equal(e.base,2);assert.ok(Math.abs(e.attackInterval()-1.87)<.02,'wave 1: '+e.attackInterval());assert.equal(e.maxSingles(),2);
  const f=make();f.launchTimer=0;f.flagTimer=1e9;f.hitPlayer=()=>{};let n=0;for(let i=0;i<120*20+12;i++){f.step(C.step,{});n+=f.events.filter(v=>v.type==='dive').length;f.events=[]}delete f.hitPlayer;assert.ok(n>=5&&n<=13,'dives in 20 s: '+n);assert.equal(f.extra,1,'extra after 20 s');assert.ok(f.singles()<=f.maxSingles());
  f.hitPlayer();assert.equal(f.extra,0,'a lost ship eases it');f.extra=7;f.base=7;assert.equal(f.maxSingles(),4);assert.ok(f.attackInterval()<.5)});
 test('while a flagship is in the formation red aliens do not attack alone',()=>{const e=calm(make());only(e,a=>a.type==='red'||a.type==='flag');for(let i=0;i<5;i++)e.launchSingle();assert.ok(!e.aliens.some(a=>a.state==='dive'),'reds wait');only(e,a=>a.type==='red');e.launchSingle();assert.ok(e.aliens.some(a=>a.state==='dive'),'then they go')});
 test('a flagship leads an attack every 9 s on wave 1',()=>{const e=make();assert.ok(Math.abs(e.flagInterval()-9.6)<.01);e.launchTimer=0;e.counters=e.counters.map(()=>1e9);let t=0;while(!e.aliens.some(a=>a.type==='flag'&&a.state==='dive')&&t<1200){step(e,12);t++}assert.ok(t*.1>9&&t*.1<10.1,'at '+t*.1)});
 test('shooting a diving flagship stuns the swarm: no alien leaves or fires until 4 s after the last attacker is gone',()=>{const e=calm(make());const f=of(e,'flag');e.startDive(f,1);e.kill(f);assert.equal(e.shock,C.shock);e.launchTimer=0;
  const b=of(e,'blue');e.startDive(b,1);e.events=[];let n=0;while(b.state!=='form'&&n<3000){e.player.x=b.x<512?984:40;step(e,1);n++}assert.ok(!e.events.some(v=>v.type==='bomb'||v.type==='dive'),'quiet');assert.ok(e.shock>0,'still stunned');step(e,Math.ceil(C.shock/C.step)+1);assert.equal(e.shock,0)});
 test('a flagship that gets away without escorts leaves the wave; up to two join the next formation',()=>{const e=calm(make());const f=of(e,'flag');e.startDive(f,1);f.t=5;f.fireAt=[];f.y=768+40;step(e,1);assert.ok(!f.alive&&f.escaped);assert.equal(e.survivors,1);
  only(e,()=>false);step(e,2);step(e,Math.ceil(C.waveDelay/C.step)+2);assert.equal(e.aliens.filter(a=>a.type==='flag').length,3);assert.ok(e.flagInterval()<9.6,'and they attack sooner')});
 test('with three or fewer left in the formation, a diver that misses comes back from the top and attacks again',()=>{const e=calm(make());only(e,a=>a.row===5&&a.col<4);const a=of(e,'blue');e.startDive(a,1);let n=0,back=false;while(n<3000&&!back){e.player.x=a.x<512?984:40;e.bullets=[];step(e,1);n++;if(a.y<0&&a.state==='dive')back=true}
  assert.ok(back,'keeps attacking');assert.ok(a.state!=='return','not back to its place')});
 test('power (owner 2026-10-28): each flagship shot down grows the volley 1, 2, 3 shots; still one volley at a time; a lost life starts over',()=>{const e=calm(make());assert.equal(e.power,0);e.fire();assert.equal(e.shot.parts.length,1);e.shot=null;
  e.kill(of(e,'flag'));assert.equal(e.power,1);e.fire();assert.equal(e.shot.parts.length,2,'slide rule');e.fire();assert.equal(e.shots,2,'one volley at a time');e.shot=null;
  e.kill(of(e,'flag'));assert.equal(e.power,2);e.fire();assert.equal(e.shot.parts.length,3,'keyboard');assert.ok(e.shot.parts.some(p=>p.vx<0)&&e.shot.parts.some(p=>p.vx>0),'a fan');
  e.shot=null;e.hitPlayer();assert.equal(e.power,0,'starts over')});
 test('the demo pilot shoots down aliens',()=>{const e=make(3);for(let i=0;i<120*60;i++)e.step(C.step,e.pilot());assert.ok(e.score>=400,'score '+e.score)});
 return count}
g.GalgebraTests={run};if(typeof module!=='undefined')module.exports=g.GalgebraTests;
})(globalThis);
