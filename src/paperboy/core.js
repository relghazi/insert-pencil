'use strict';
/* Term Paperboy: Atari Paperboy (1985) rules, drawn as a boy on his bike delivering rolled term papers through her school neighbourhood.
   Rules follow the original cabinet on Easy Street: the street runs diagonally up the screen and scrolls as the bike rides on;
   pushing forward speeds up, pulling back brakes (the bike never stops) and left and right steer; papers are thrown to the left,
   at the houses; of the 20 houses on the street 10 start as subscribers (the bright ones); a paper in a subscriber's mailbox scores
   250, on the doorstep 100, and only the first delivery to a house counts; breaking a non-subscriber's window adds 100 to the Breakage Bonus,
   paid at the end of the day (or of the game), and a
   paper that knocks down a walker (break dancer, sleepwalker, groundskeeper) scores 100; at the end of the day every subscriber
   who got no paper, or whose window was broken, cancels; papers run out and bundles on the street refill them; cars, tyres, dogs,
   the groundskeeper's mower, the break dancer, the sleepwalker, the tornado and the Grim Reaper cost a life on contact; after the
   route comes the training course with unlimited papers: targets 100, ramp jumps 200, and a crash there only ends the course;
   then a bonus for each delivery, doubled on a perfect day, which also wins back one subscriber (up to 10); the days run Monday
   to Sunday, and on Sunday the papers are heavier and fly slower; the game ends when the lives or the subscribers run out, or
   after the Sunday course with a bonus for each life left. Four lives and one extra life at 15,000 (the factory
   settings in Atari's operator manual TM-275, checked 2026-10-26; Atari's 1984 sales flyer 32M12-84 (archive.org
   arcadeflyer_paperboy) gives "Delivery: 100 or 250, Breakage: 100-250, Jumps: 200", "most points are scored by hitting
   the mailboxes" and a perfect day "twice the score for each house delivered"; x2 and x3 on the harder streets are not used).
   Adaptations (not ROM-exact): one street (Easy Street) that varies by day, with more and newer hazards each day (break dancer
   from Tuesday, sleepwalker (the cabinet's drunk) from Wednesday, tornado from Thursday, Grim Reaper from Friday); the cabinet's
   remaining values were not found (operator manual, flyer, MAME, arcade-history, FAQs; no program source is public), so the
   delivery bonus is 250 a delivery, window breakage 100 (inside the flyer's 100 to 250), walkers 100, targets 100 and the
   Sunday life bonus 5,000; the course's time bonus and flower beds are left out; a bundle refills the bag to 10; houses
   have the door and three windows where her drawing puts them; speeds and hazard paths tuned by eye at 120 Hz.
   Review against the cabinet (owner 2026-10-28): the bike starts and restarts on the sidewalk and may ride the street and the
   front yards, where mailboxes and hedges are solid (stationary objects cost a life on the cabinet); papers fly far enough to
   reach the houses from the street; dogs and groundskeepers live in the yards of houses that do not subscribe, a dog chases
   only once the bike has passed and runs slower than a cruising bike, then trots home; no hazard in front of the first two
   houses and hazards wake before they come into view; a 1.5 s grace (the bike blinks) after a crash; the training course runs
   against a 30 s clock, running out of time ends it like a crash and crossing the line pays 1,000 (the cabinet's finish bonus;
   its value was not found). Left out: the bees that chase a dawdling bike (no art yet). */
(function(g){
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['axis','n',-1,1,20],['axisY','n',-1,1,20],['fire','b']],
  houses:20,subscribers:10,houseLen:380,streetStart:600,streetTail:500,
  wallV:-300,porchV:-245,porchHalf:44,doorHalf:22,windows:Object.freeze([-150,-60,70]),windowHalf:24,mailboxAt:-215,mailboxV:-150,mailboxHalf:22,lawnV:-200,
  minV:-235,maxV:145,laneV:-105,riderR:16,safe:1.5,
  speed:Object.freeze({min:70,cruise:140,max:260,accel:220,brake:300,relax:120}),steer:210,
  paper:Object.freeze({speed:560,flight:.75,sundaySpeed:420,sundayFlight:.93,cooldown:.25}),papers:10,bundleRefill:10,bundles:3,
  points:Object.freeze({mailbox:250,doorstep:100,window:100,knock:100,target:100,jump:200,delivery:250,life:5000}),
  hazards:Object.freeze({car:{from:0,ru:42,rv:24,hit:false},tyre:{from:0,ru:12,rv:12,hit:false},dog:{from:0,ru:16,rv:12,hit:false},worker:{from:0,ru:24,rv:18,hit:true},
   dancer:{from:1,ru:16,rv:16,hit:true},drunk:{from:2,ru:14,rv:14,hit:true},tornado:{from:3,ru:22,rv:22,hit:false},reaper:{from:4,ru:14,rv:14,hit:false}}),
  hazardBase:10,hazardPerDay:2,wake:1000,behind:500,dogRange:0,dogSpeed:120,dogChase:2.2,hazardFrom:1360,
  course:Object.freeze({length:2600,targets:8,ramps:5,targetV:-200,air:.7,jump:120,wallGap:70,time:30,finish:1000}),
  mailboxR:Object.freeze({ru:10,rv:10}),hedgeR:Object.freeze({ru:30,rv:14}),
  days:Object.freeze(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
  lives:4,extraAt:15000,deathPause:2,reportPause:3.5});
class SeededRandom{constructor(seed=1981){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const C=CONFIG,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),streetEnd=C.streetStart+C.houses*C.houseLen;
class PaperboyEngine{
 constructor(seed=1981){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=C.lives;this.extraGiven=false;this.day=0;this.throws=0;this.state='play';this.timer=0;this.report=null;
  // Ten of the twenty houses start as subscribers.
  this.houses=[...Array(C.houses)].map((_,i)=>({i,u0:C.streetStart+i*C.houseLen,mid:C.streetStart+(i+.5)*C.houseLen+40,sub:false,style:i%2}));
  for(let n=0;n<C.subscribers;){const h=this.houses[Math.floor(this.rng.next()*C.houses)];if(!h.sub){h.sub=true;n++}}
  this.newDay();return this}
 r(a,b){return a+(b-a)*this.rng.next()}
 // A new day: the same street, fresh papers, and that day's hazards and bundles placed along it.
 newDay(){this.breakage=0;this.phase='route';this.state='play';this.papers=C.papers;this.flying=[];this.landed=[];this.lastFire=false;this.cool=0;
  this.rider={u:0,v:C.laneV,speed:C.speed.cruise,h:0,air:0,throwT:0};
  for(const h of this.houses)Object.assign(h,{delivered:null,damaged:false,broken:C.windows.map(()=>false)});
  const types=Object.keys(C.hazards).filter(k=>C.hazards[k].from<=this.day),n=C.hazardBase+C.hazardPerDay*this.day;this.hazards=[];
  for(let i=0;i<n;i++){const u=C.hazardFrom+(streetEnd-C.hazardFrom-300)*(i+this.rng.next()*.8)/n,type=types[Math.floor(this.rng.next()*types.length)];this.hazards.push(this.hazard(type,this.yardOf(type,u)))}
  this.bundles=[...Array(C.bundles)].map((_,i)=>({u:C.streetStart+(i+.5)*(streetEnd-C.streetStart)/C.bundles+this.r(-80,80),v:this.rng.next()<.5?-105:this.r(-20,60),taken:false}));
  this.events.push({type:'day',day:this.day,name:C.days[this.day]})}
 // Dogs and groundskeepers belong to the houses that do not take the paper (the original's hostile neighbours): placed at the nearest one.
 yardOf(type,u){if(type!=='dog'&&type!=='worker')return u;let best=null;for(const h of this.houses)if(!h.sub&&(!best||Math.abs(h.mid-u)<Math.abs(best.mid-u)))best=h;return best&&Math.abs(best.mid-u)<C.houseLen*1.5&&best.mid>C.hazardFrom?best.mid-60:u}
 hazard(type,u){const h={type,u,v:0,u0:u,v0:0,vu:0,vv:0,t:0,active:false,alive:true,dir:-1,chase:0};
  if(type==='car'){h.v=this.r(40,120);h.vu=-160}else if(type==='tyre'){h.v=this.r(0,120);h.vu=-110}else if(type==='dog'){h.v=C.lawnV}
  else if(type==='worker'){h.v=this.r(-220,-90);h.vv=this.rng.next()<.5?70:-70}else if(type==='dancer'){h.v=-105}else if(type==='drunk'){h.v=-125;h.vv=45}
  else if(type==='tornado'){h.v=30;h.vu=-70}else if(type==='reaper'){h.v=170;h.vv=-55}
  h.v0=h.v;return h}
 houseAt(u){const i=Math.floor((u-C.streetStart)/C.houseLen);return this.phase==='route'?this.houses[i]||null:null}
 award(n,ev){this.score+=n;if(ev)this.events.push(Object.assign({points:n},ev));if(!this.extraGiven&&this.score>=C.extraAt){this.extraGiven=true;this.lives++;this.events.push({type:'extra'})}}
 // Breakage: what a paper smashes at a house that does not subscribe goes into the Breakage Bonus, paid at the end of the day.
 smash(n,ev){this.breakage+=n;this.events.push(Object.assign({points:n,breakage:true},ev))}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  if(this.state==='dead'||this.state==='report'){this.timer-=dt;if(this.timer<=0){if(this.state==='report')this.afterReport();else if(this.phase==='course')this.endCourse();else this.respawn()}return}
  this.ride(dt,input);this.throwPaper(dt,input);this.movePapers(dt);
  if(this.phase==='route'){this.moveHazards(dt);this.pickup();this.collide();if(this.state==='play'&&this.rider.u>=streetEnd+C.streetTail)this.startCourse()}
  else{this.courseStep(dt);if(this.state==='play'&&this.rider.u>=C.course.length){this.award(C.course.finish,{type:'finish',u:this.rider.u,v:this.rider.v});this.endCourse()}}}
 // Forward speeds up and back brakes, but the bike never stops; let go and it settles back to cruising speed.
 ride(dt,input){const R=this.rider,S=C.speed,ax=clamp(Number(input.axis)||0,-1,1)||((input.right?1:0)-(input.left?1:0)),ay=clamp(Number(input.axisY)||0,-1,1)||((input.down?1:0)-(input.up?1:0));
  if(ay<0)R.speed+=S.accel*-ay*dt;else if(ay>0)R.speed-=S.brake*ay*dt;else R.speed+=clamp(S.cruise-R.speed,-S.relax*dt,S.relax*dt);R.speed=clamp(R.speed,S.min,S.max);
  R.u+=R.speed*dt;R.v=clamp(R.v+ax*C.steer*dt,C.minV,C.maxV);R.throwT=Math.max(0,R.throwT-dt);R.safe=Math.max(0,(R.safe||0)-dt);
  if(R.air>0){R.air=Math.max(0,R.air-dt);R.h=Math.sin(Math.PI*R.air/(R.airT||C.course.air))*60;if(!R.air){R.h=0;this.award(C.points.jump,{type:'jump',u:R.u,v:R.v})}}}
 // One paper per press, thrown to the left at the houses, carrying the bike's speed forward. Sunday papers are heavier.
 throwPaper(dt,input){this.cool=Math.max(0,this.cool-dt);const fire=!!input.fire,edge=fire&&!this.lastFire;this.lastFire=fire;
  if(!edge||this.cool>0)return;const course=this.phase==='course';if(!course&&this.papers<=0){this.events.push({type:'empty'});return}
  if(!course)this.papers--;const R=this.rider,sun=this.day===6,P=C.paper;this.cool=P.cooldown;R.throwT=.3;this.throws++;
  this.flying.push({u:R.u,v:R.v-10,vu:R.speed,vv:-(sun?P.sundaySpeed:P.speed),t:0,life:sun?P.sundayFlight:P.flight});this.events.push({type:'throw'})}
 movePapers(dt){for(const p of this.flying){const pv=p.v;p.u+=p.vu*dt;p.v+=p.vv*dt;p.t+=dt;p.h=Math.sin(Math.PI*Math.min(1,p.t/p.life))*40;
   if(this.phase==='route')this.paperRoute(p,pv);else this.paperCourse(p,pv);if(!p.done&&p.t>=p.life)this.land(p)}
  this.flying=this.flying.filter(p=>!p.done);if(this.landed.length>40)this.landed.splice(0,this.landed.length-40)}
 stop(p,v=p.v){p.done=true;this.landed.push({u:p.u,v})}
 deliver(h,how,p){if(!h||!h.sub||h.delivered)return;h.delivered=how;this.award(C.points[how],{type:'deliver',how,house:h.i,u:p.u,v:p.v})}
 // Along its flight a paper can hit the mailbox, a walker, then the front wall: the door counts as the doorstep, a window breaks.
 paperRoute(p,pv){const h=this.houseAt(p.u);
  if(h&&pv>C.mailboxV&&p.v<=C.mailboxV&&Math.abs(p.u-(h.mid+C.mailboxAt))<=C.mailboxHalf){this.deliver(h,'mailbox',p);return this.stop(p,C.mailboxV)}
  for(const z of this.hazards)if(z.active&&z.alive&&C.hazards[z.type].hit&&Math.abs(z.u-p.u)<C.hazards[z.type].ru+8&&Math.abs(z.v-p.v)<C.hazards[z.type].rv+8){z.alive=false;this.award(C.points.knock,{type:'knock',kind:z.type,u:z.u,v:z.v});return this.stop(p)}
  if(p.v<=C.wallV){if(!h)return this.stop(p,C.wallV+12);const rel=p.u-h.mid;
   if(Math.abs(rel)<=C.doorHalf)this.deliver(h,'doorstep',p);
   else{const w=C.windows.findIndex(c=>Math.abs(rel-c)<=C.windowHalf);if(w>=0&&!h.broken[w]){h.broken[w]=true;this.events.push({type:'glass',house:h.i,sub:h.sub,u:p.u,v:C.wallV});if(h.sub)h.damaged=true;else this.smash(C.points.window,{type:'window',house:h.i,u:p.u,v:C.wallV})}}
   return this.stop(p,C.wallV+12)}}
 land(p){if(this.phase==='route'){const h=this.houseAt(p.u);if(h&&p.v<=C.porchV&&Math.abs(p.u-h.mid)<=C.porchHalf)this.deliver(h,'doorstep',p)}this.stop(p)}
 // Bundles on the street refill the bag.
 pickup(){const R=this.rider;for(const b of this.bundles)if(!b.taken&&Math.abs(b.u-R.u)<26&&Math.abs(b.v-R.v)<30){b.taken=true;this.papers=Math.max(this.papers,C.bundleRefill);this.events.push({type:'bundle',u:b.u,v:b.v})}}
 // Hazards wake when they come on screen and move on their own paths; dogs give chase for a while.
 moveHazards(dt){const R=this.rider;for(const z of this.hazards){if(!z.alive)continue;if(!z.active){if(z.u-R.u<C.wake)z.active=true;else continue}
  if(z.u<R.u-C.behind){z.alive=false;continue}z.t+=dt;
  if(z.type==='dog'){if(z.chase===0&&z.u-R.u<C.dogRange)z.chase=C.dogChase;if(z.chase>0){z.chase-=dt;if(z.chase>0){const du=R.u-z.u,dv=R.v-z.v,d=Math.hypot(du,dv)||1;z.vu=du/d*C.dogSpeed;z.vv=dv/d*C.dogSpeed}else z.chase=-1}
   // The chase over, the dog trots back to its own lawn.
   if(z.chase<0){z.vu=0;z.vv=Math.abs(z.v-C.lawnV)<4?0:Math.sign(C.lawnV-z.v)*80}}
  else if(z.type==='worker'){if(z.v<-230)z.vv=70;else if(z.v>-85)z.vv=-70}
  else if(z.type==='dancer'){z.vu=Math.cos(z.t*1.5)*60}
  else if(z.type==='drunk'){z.vu=Math.sin(z.t*2)*50;if(z.v>160)z.vv=-45;else if(z.v<-130)z.vv=45}
  else if(z.type==='tornado'){z.v=z.v0+Math.sin(z.t*1.3)*110}
  else if(z.type==='reaper'){if(z.v<-130)z.vv=55;else if(z.v>175)z.vv=-55}
  else if(z.type==='tyre'){z.v=z.v0+Math.sin(z.t*3)*14}
  z.u+=z.vu*dt;z.v+=z.vv*dt;if(z.vu||z.vv)z.dir=Math.abs(z.vu)>Math.abs(z.vv)?Math.sign(z.vu):Math.sign(z.vv)}}
 collide(){const R=this.rider;if(R.safe>0)return;
  // The yards are rideable, but the mailboxes and hedges standing in them are solid, like everything on the cabinet's street.
  const h=this.houseAt(R.u+C.houseLen/2-40)||this.houseAt(R.u);for(const H of [h,this.houseAt(R.u)])if(H){const M=C.mailboxR,G=C.hedgeR;
   if(Math.abs(H.mid+C.mailboxAt-R.u)<M.ru+C.riderR*.6&&Math.abs(C.mailboxV-R.v)<M.rv+C.riderR*.6)return this.crash({type:'mailbox'});
   if(H.i%2===1&&Math.abs(H.mid-230-R.u)<G.ru+C.riderR*.6&&Math.abs(-200-R.v)<G.rv+C.riderR*.6)return this.crash({type:'hedge'})}
  for(const z of this.hazards){if(!z.active||!z.alive)continue;const k=C.hazards[z.type];if(Math.abs(z.u-R.u)<k.ru+C.riderR&&Math.abs(z.v-R.v)<k.rv+C.riderR)return this.crash(z)}}
 crash(z){const R=this.rider;this.flying=[];this.events.push({type:'crash',kind:z?.type||'wall',u:R.u,v:R.v,course:this.phase==='course'});this.state='dead';this.timer=C.deathPause;
  if(this.phase==='course')return;this.lives--;this.events.push({type:'death',lives:this.lives});if(this.lives<=0)this.gameOver()}
 gameOver(){if(this.breakage){this.award(this.breakage);this.breakage=0}this.state='end';this.events.push({type:'gameover',score:this.score})}
 // After a crash the ride goes on from the same spot on the sidewalk, the hazards close by cleared away and a moment's grace (the bike blinks).
 respawn(){const R=this.rider;for(const z of this.hazards)if(z.u>R.u-200&&z.u<R.u+500)z.alive=false;R.v=C.laneV;R.speed=C.speed.cruise;R.safe=C.safe;this.state='play';this.lastFire=true}
 // Training course: targets to the left, ramps with low walls just past them that a jump clears at any speed; unlimited papers, and a crash only ends the course.
 startCourse(){this.phase='course';this.flying=[];this.landed=[];const K=C.course,R=this.rider;R.u=0;R.v=C.laneV;R.speed=C.speed.cruise;this.courseTime=K.time;
  this.targets=[...Array(K.targets)].map((_,i)=>({u:400+i*(K.length-700)/K.targets+this.r(0,120),v:K.targetV,hit:false}));
  this.ramps=[...Array(K.ramps)].map((_,i)=>{const u=550+i*(K.length-900)/K.ramps+this.r(0,100),lo=this.r(-90,60);return{u,lo,hi:lo+80,used:false}});
  this.walls=this.ramps.map(r=>({u:r.u+K.wallGap,lo:r.lo-30,hi:r.hi+30}));this.events.push({type:'course'})}
 courseStep(dt){const R=this.rider;
  // The course runs against the clock; running out of time ends it like a crash.
  if((this.courseTime-=dt)<=0){this.courseTime=0;this.events.push({type:'timeup'});return this.crash(null)}
  // A ramp carries the bike the same distance at any speed, clear over the low wall past it.
  for(const r of this.ramps)if(!R.air&&Math.abs(R.u-r.u)<22&&R.v>=r.lo&&R.v<=r.hi){R.airT=R.air=Math.max(C.course.air,C.course.jump/R.speed);r.used=true;this.events.push({type:'ramp'})}
  for(const w of this.walls)if(!R.air&&Math.abs(R.u-w.u)<12&&R.v>=w.lo-C.riderR&&R.v<=w.hi+C.riderR)return this.crash(null)}
 paperCourse(p,pv){for(const t of this.targets)if(!t.hit&&pv>t.v&&p.v<=t.v&&Math.abs(p.u-t.u)<=26){t.hit=true;this.award(C.points.target,{type:'target',u:t.u,v:t.v});return this.stop(p,t.v)}}
 // End of the day: a bonus for each delivery, doubled on a perfect day; subscribers who were missed or damaged cancel.
 endCourse(){const subs=this.houses.filter(h=>h.sub),ok=subs.filter(h=>h.delivered&&!h.damaged),lost=subs.filter(h=>!h.delivered||h.damaged),perfect=subs.length>0&&!lost.length;
  const breakage=this.breakage,bonus=ok.length*C.points.delivery*(perfect?2:1)+breakage;this.breakage=0;this.award(bonus);for(const h of lost)h.sub=false;
  if(perfect){const free=this.houses.filter(h=>!h.sub);if(subs.length<C.subscribers&&free.length)free[Math.floor(this.rng.next()*free.length)].sub=true}
  this.report={day:this.day,delivered:ok.length,cancelled:lost.length,perfect,bonus,breakage,subscribers:this.houses.filter(h=>h.sub).length};
  this.events.push(Object.assign({type:'report'},this.report));if(perfect)this.events.push({type:'perfect',day:this.day});this.state='report';this.timer=C.reportPause}
 afterReport(){if(!this.houses.some(h=>h.sub))return this.gameOver();
  if(this.day>=C.days.length-1){const b=this.lives*C.points.life;this.award(b);this.events.push({type:'week',bonus:b,lives:this.lives});return this.gameOver()}
  this.day++;this.newDay()}
 // Demo pilot: rides the middle of the road, times each throw for the mailbox (windows on the houses that do not subscribe),
 // steers round whatever is ahead, picks up bundles when low and lines up the ramps on the course.
 pilot(){const R=this.rider,sun=this.day===6,vv=sun?C.paper.sundaySpeed:C.paper.speed;let want=C.laneV,fire=false,ay=0;
  const lead=v=>R.speed*(R.v-10-v)/vv;
  if(this.phase==='route'){
   if(this.papers<4){const b=this.bundles.find(b=>!b.taken&&b.u>R.u+20&&b.u<R.u+600);if(b)want=b.v}
   for(const h of this.houses){if(h.u0>R.u+500||h.u0+C.houseLen<R.u-100)continue;
    const aims=h.sub?(h.delivered?[]:[[h.mid+C.mailboxAt,C.mailboxV]]):this.papers<5?[]:h.broken.map((b,i)=>b?null:[h.mid+C.windows[i],C.wallV]).filter(Boolean);
    for(const [u,v] of aims){const at=u-lead(v);if(R.u>=at-3&&R.u<=at+3)fire=true}}
   for(const z of this.hazards){if(!z.active||!z.alive)continue;const du=z.u-R.u,k=C.hazards[z.type];if(du<-30||du>240)continue;if(Math.abs(z.v-R.v)<k.rv+60){want=z.v>R.v?Math.max(C.minV,z.v-k.rv-80):Math.min(C.maxV,z.v+k.rv+80);if(want===C.minV&&z.v-R.v<k.rv+40)want=C.maxV;ay=z.type==='dog'?-1:1}}}
  else{for(const t of this.targets){if(t.hit)continue;const at=t.u-lead(t.v);if(R.u>=at-3&&R.u<=at+3)fire=true}
   const r=this.ramps.find(r=>r.u>R.u-10&&r.u<R.u+400);if(r)want=(r.lo+r.hi)/2}
  if(this.cool>0)fire=false;if(this.phase==='route')want=Math.max(want,-125);const d=want-R.v;return{axis:Math.abs(d)<4?0:clamp(d/20,-1,1),axisY:ay,fire:fire&&!this.lastFire}}
 snapshot(){const R=this.rider;return{state:this.state,phase:this.phase,clock:+this.clock.toFixed(4),score:this.score,lives:this.lives,day:this.day,papers:this.papers,throws:this.throws,
  rider:{u:+R.u.toFixed(2),v:+R.v.toFixed(2),speed:+R.speed.toFixed(2)},subs:this.houses.filter(h=>h.sub).map(h=>h.i),delivered:this.houses.filter(h=>h.delivered).map(h=>h.i+':'+h.delivered),
  hazards:this.hazards.filter(z=>z.alive).length,report:this.report}}
}
const PaperboyCore={CONFIG,PaperboyEngine,SeededRandom,streetEnd};
g.PaperboyCore=PaperboyCore;if(typeof module!=='undefined')module.exports=PaperboyCore;
})(globalThis);
