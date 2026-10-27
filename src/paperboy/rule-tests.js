'use strict';
// Term Paperboy rule checks: one per 1985 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,PaperboyEngine:Engine,streetEnd}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const make=(seed=1981)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 // A quiet street: no hazards, no bundles.
 const bare=(seed=1981)=>{const e=make(seed);e.hazards=[];e.bundles=[];e.events=[];return e};
 // Throw one paper from where the rider is and let it fly out.
 const toss=(e,u,v=C.laneV)=>{const s=e.rider.speed;Object.assign(e.rider,{u,v,speed:0});e.lastFire=false;e.cool=0;e.throwPaper(0,{fire:true});e.lastFire=false;for(let i=0;i<240&&e.flying.length;i++)e.movePapers(C.step);e.rider.speed=s};
 const sub=e=>e.houses.find(h=>h.sub),non=e=>e.houses.find(h=>!h.sub);
 const finish=e=>{e.endCourse();step(e,Math.ceil(C.reportPause/C.step)+2)};
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<6000;i++){const inp={axis:Math.sin(i/70),axisY:Math.cos(i/90)*.5,fire:i%40<20};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('twenty houses on the street, ten of them subscribers, four lives, Monday',()=>{const e=make();assert.equal(e.houses.length,20);assert.equal(e.houses.filter(h=>h.sub).length,10);assert.equal(e.lives,4);assert.equal(C.days[e.day],'monday')});
 test('forward speeds up, back brakes, the bike never stops and settles back to cruising',()=>{const e=bare();step(e,240,{axisY:-1});assert.equal(e.rider.speed,C.speed.max);step(e,240,{axisY:1});assert.equal(e.rider.speed,C.speed.min,'never stops');
  step(e,240);assert.equal(e.rider.speed,C.speed.cruise);e.rider.u=0;const u=e.rider.u;step(e,120,{axis:-1});assert.ok(e.rider.u>u,'still rolling');assert.equal(e.rider.v,C.minV,'steered into the yards')});
 test('the bike starts on the sidewalk and can ride the street and the front yards',()=>{const e=make();assert.equal(e.rider.v,C.laneV);assert.ok(C.laneV<-90&&C.laneV>-130,'sidewalk');assert.ok(C.minV<C.mailboxV&&C.minV>C.porchV,'yards, short of the porch');assert.ok(C.maxV>100,'street')});
 test('mailboxes and hedges in the yards are solid',()=>{const e=bare(),h=e.houses[1];Object.assign(e.rider,{u:h.mid+C.mailboxAt,v:C.mailboxV});e.collide();assert.equal(e.state,'dead','mailbox');assert.equal(e.lives,C.lives-1);
  const f=bare(),k=f.houses[1];Object.assign(f.rider,{u:k.mid-230,v:-200});f.collide();assert.equal(f.state,'dead','hedge');const g2=bare(),m=g2.houses[2];Object.assign(g2.rider,{u:m.mid-230,v:-200});g2.collide();assert.equal(g2.state,'play','no hedge at that house')});
 test('after a crash the bike starts again on the sidewalk with a moment of grace',()=>{const e=bare();const z=e.hazard('car',e.rider.u+5);z.v=e.rider.v;z.active=true;e.hazards=[z];e.collide();step(e,Math.ceil(C.deathPause/C.step)+2);assert.equal(e.state,'play');assert.equal(e.rider.v,C.laneV);assert.ok(e.rider.safe>1,'grace');
  const y=e.hazard('car',e.rider.u+5);y.v=e.rider.v;y.vu=0;y.active=true;e.hazards=[y];e.collide();assert.equal(e.state,'play','safe');step(e,Math.ceil(C.safe/C.step)+2);y.u=e.rider.u;y.v=e.rider.v;e.collide();assert.equal(e.state,'dead','grace over')});
 test('no hazards in front of the first two houses',()=>{for(const seed of [1,2,3,1981]){const e=make(seed);assert.ok(e.hazards.every(z=>z.u>=C.hazardFrom),'seed '+seed)}});
 test('a paper in a subscriber mailbox scores 250, only once per house',()=>{const e=bare(),h=sub(e);toss(e,h.mid+C.mailboxAt);assert.equal(e.score,250);assert.equal(h.delivered,'mailbox');toss(e,h.mid+C.mailboxAt);assert.equal(e.score,250,'once')});
 test('a paper on the doorstep scores 100',()=>{const e=bare(),h=sub(e);toss(e,h.mid,C.laneV);assert.equal(h.delivered,'doorstep');assert.equal(e.score,100);const f=bare(),k=sub(f);toss(f,k.mid,-120);assert.equal(k.delivered,'doorstep','at the door');assert.equal(f.score,100)});
 test('a non-subscriber window adds 100 to the Breakage Bonus, paid at the end of the day; a subscriber window cancels them',()=>{const e=bare(),n=non(e),s=sub(e);toss(e,n.mid+C.windows[0],-120);assert.equal(e.breakage,100);assert.equal(e.score,0,'paid later');assert.ok(n.broken[0]);toss(e,n.mid+C.windows[0],-120);assert.equal(e.breakage,100,'already broken');
  toss(e,s.mid+C.windows[1],-120);assert.equal(e.breakage,100);assert.ok(s.damaged);e.startCourse();finish(e);assert.ok(!s.sub,'cancelled');assert.equal(e.report.breakage,100);assert.ok(e.score>=100,'breakage paid');assert.equal(e.breakage,0)});
 test('a subscriber left without a paper cancels at the end of the day',()=>{const e=bare(),subs=e.houses.filter(h=>h.sub);subs.slice(1).forEach(h=>h.delivered='mailbox');e.startCourse();finish(e);
  assert.ok(!subs[0].sub,'missed one cancels');assert.equal(e.houses.filter(h=>h.sub).length,9);assert.equal(e.report.cancelled,1);assert.equal(e.day,1)});
 test('a bonus for each delivery at the end of the day',()=>{const e=bare(),subs=e.houses.filter(h=>h.sub);subs.slice(0,6).forEach(h=>h.delivered='doorstep');e.startCourse();e.endCourse();assert.equal(e.score,6*C.points.delivery);assert.equal(e.report.delivered,6)});
 test('a perfect day doubles the bonus and wins back a subscriber (no extra life)',()=>{const e=bare();e.houses.filter(h=>h.sub)[0].sub=false;e.houses.filter(h=>h.sub).forEach(h=>h.delivered='mailbox');e.startCourse();e.endCourse();
  assert.ok(e.report.perfect);assert.equal(e.score,9*C.points.delivery*2);assert.equal(e.houses.filter(h=>h.sub).length,10,'back to ten');assert.equal(e.lives,C.lives)});
 test('four lives and one extra life at 15,000',()=>{const e=bare();assert.equal(e.lives,4);e.award(14990);assert.equal(e.lives,4);e.award(10);assert.equal(e.lives,5);e.award(50000);assert.equal(e.lives,5,'only one')});
 test('papers run out; a bundle refills the bag',()=>{const e=bare();e.papers=1;toss(e,1000);assert.equal(e.papers,0);toss(e,1100);assert.equal(e.throws,1,'no paper, no throw');
  e.bundles=[{u:e.rider.u+40,v:C.laneV,taken:false}];e.rider.v=C.laneV;step(e,60);assert.equal(e.papers,C.bundleRefill)});
 test('one paper per press',()=>{const e=bare();step(e,60,{fire:true});assert.equal(e.throws,1);step(e,2);step(e,60,{fire:true});assert.equal(e.throws,2)});
 test('a car, a tyre, the mower, the break dancer, the sleepwalker, the tornado and the Grim Reaper each cost a life',()=>{for(const t of ['car','tyre','worker','dancer','drunk','tornado','reaper']){const e=bare();const z=e.hazard(t,e.rider.u+5);z.v=e.rider.v;z.vu=z.vv=0;z.active=true;e.hazards=[z];e.collide();
  assert.equal(e.lives,C.lives-1,t);assert.equal(e.state,'dead');step(e,Math.ceil(C.deathPause/C.step)+2);assert.equal(e.state,'play',t)}});
 test('a dog gives chase once the bike rides by, slower than the bike, then trots home',()=>{const e=bare();const z=e.hazard('dog',e.rider.u+400);e.hazards=[z];e.rider.v=C.maxV;e.rider.speed=0;e.step(C.step,{});assert.equal(z.chase,0,'waits in its yard');
  e.rider.u=z.u+10;step(e,60);assert.ok(z.chase>0,'chasing');assert.ok(Math.abs(z.v-C.lawnV)>20,'left the lawn');assert.ok(C.dogSpeed<C.speed.cruise,'a cruising bike outruns it');step(e,Math.ceil(C.dogChase/C.step));assert.equal(z.chase,-1,'gave up');step(e,1);assert.ok(Math.abs(z.v-C.lawnV)<6||Math.sign(z.vv)===Math.sign(C.lawnV-z.v),'heading back to its lawn');assert.equal(z.vu,0)});
 test('new hazards join as the week goes on: break dancer Tuesday, sleepwalker Wednesday, tornado Thursday, Grim Reaper Friday',()=>{const e=bare();const seen=[];for(let d=0;d<7;d++){e.day=d;e.newDay();seen.push(new Set(e.hazards.map(z=>z.type)))}
  assert.ok(!seen[0].has('dancer')&&!seen[0].has('reaper'),'monday');assert.ok(seen[0].has('car'),'cars from monday');assert.ok(!seen[3].has('reaper'),'no reaper thursday');assert.ok(seen[6].size>=6,'all week');assert.ok(e.hazards.length>make().hazards.length,'more each day')});
 test('a paper knocks down a walker for 100',()=>{const e=bare();const z=e.hazard('dancer',1000);z.active=true;z.u=1000;z.v=-170;e.hazards=[z];toss(e,1000,C.laneV);assert.ok(!z.alive);assert.equal(e.score,100)});
 test('training course: unlimited papers, targets 100, jumps 200 (Atari flyer) that clear the wall at any speed, and a crash only ends the course',()=>{const e=bare();e.rider.u=streetEnd+C.streetTail-1;step(e,2);assert.equal(e.phase,'course');assert.equal(C.points.jump,200);e.papers=0;e.throwPaper(0,{fire:true});assert.equal(e.flying.length,1,'unlimited papers');
  const f=bare();f.startCourse();const tt=f.targets[0];f.rider.speed=0;toss(f,tt.u,C.laneV);assert.equal(f.score,100,'target');
  const r=f.ramps[0],wall0=f.walls[0];Object.assign(f.rider,{u:r.u-22,v:(r.lo+r.hi)/2,speed:C.speed.cruise});for(let i=0;i<600&&(f.rider.u<wall0.u+20||f.rider.air>0);i++)step(f,1);assert.equal(f.state,'play','the jump clears the wall');assert.equal(f.score,300,'jump: target 100 plus jump 200');
  for(const speed of [C.speed.min,C.speed.max]){const k=bare();k.startCourse();const q=k.ramps[0];Object.assign(k.rider,{u:q.u-22,v:(q.lo+q.hi)/2,speed});for(let i=0;i<900&&k.rider.u<k.walls[0].u+20;i++)step(k,1,speed===C.speed.max?{up:true}:{down:true});assert.equal(k.state,'play','clears at speed '+speed)}
  const w=f.walls[1];Object.assign(f.rider,{u:w.u-5,v:(w.lo+w.hi)/2,air:0});step(f,2);assert.equal(f.state,'dead');assert.equal(f.lives,C.lives,'no life lost');step(f,Math.ceil(C.deathPause/C.step)+2);assert.equal(f.state,'report')});
 test('the training course runs against the clock: the finish line pays a bonus, running out of time ends it like a crash',()=>{const e=bare();e.startCourse();e.rider.u=C.course.length-5;e.rider.v=-200;step(e,10);assert.equal(e.score,C.course.finish,'finish bonus');assert.equal(e.state,'report');
  const f=bare();f.startCourse();f.rider.speed=0;f.rider.v=-200;f.walls=[];f.ramps=[];step(f,Math.ceil(C.course.time/C.step)+2,{down:true});assert.equal(f.state,'dead','time up');assert.equal(f.lives,C.lives,'no life lost')});
 test('Monday to Sunday; Sunday papers fly slower; after the Sunday course a bonus for each life and the game ends',()=>{const e=bare();e.day=6;e.newDay();e.hazards=[];e.throwPaper(0,{fire:true});assert.equal(e.flying[0].vv,-C.paper.sundaySpeed);
  e.houses.filter(h=>h.sub).forEach(h=>h.delivered='mailbox');e.startCourse();finish(e);assert.equal(e.state,'end');assert.equal(C.days[6],'sunday');assert.equal(e.score,10*C.points.delivery*2+4*C.points.life)});
 test('the game ends when every subscriber has cancelled or the lives run out',()=>{const e=bare();e.startCourse();finish(e);assert.equal(e.state,'end');const f=bare();f.lives=1;f.crash({type:'car'});assert.equal(f.state,'end')});
 test('the demo pilot scores',()=>{const e=make(3);for(let i=0;i<120*90;i++)e.step(C.step,e.pilot());assert.ok(e.score>=1500,'score '+e.score)});
 return count}
g.PaperboyTests={run};if(typeof module!=='undefined')module.exports=g.PaperboyTests;
})(globalThis);
