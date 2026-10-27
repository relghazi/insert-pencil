'use strict';
/* Spitball Command: Atari Missile Command (1980) rules, drawn as spitballs raining on a classroom.
   Rules follow the original cabinet: six cities (desks) and three bases (left, centre, right), each base with ten
   counter-missiles per wave, the centre base's missiles flying faster; aim a crosshair and fire from a chosen base;
   a counter-missile flies to the crosshair and bursts into a circle that grows then shrinks, destroying anything
   inside it; incoming missiles fall in waves toward cities and bases, some splitting into several (MIRVs), bombers and
   satellites crossing from wave 2 drop more of them, and smart bombs from wave 6 dodge explosions; a hit destroys a
   city or a base (a base comes back next wave, a city does not); scoring: 25 per missile, 100 per bomber or
   satellite, 125 per smart bomb, then at the end of each wave 5 per unused counter-missile and 100 per surviving
   city, all multiplied by 1x (waves 1 and 2) up to 6x (wave 11 on); a bonus city every 10,000; the game ends when the
   last city is gone.
   Cabinet tables (checked 2026-10-31 against Andy McFadden's disassembly of the rev 3 ROM, 6502disassembly.com):
   ICBMs per wave 12, 15, 18, 12, 16, 14, 17, 10, 13, 16, 19, 12, 14, 16, 18, 14, 17, 19, 22 (wave 19 on), split heads
   and bomber drops included; smart bombs 1, 1, 2, 3, 4, 4, 5, 5, 6, 6, 7 from wave 6; ICBMs step one pixel every
   1 + d frames with d = 4.81, 2.88, 1.75, 1.03, .63, .38, .25, .13, .06, .04, .02, .016, .008, .004 and 0 from wave
   15; a new salvo (at most 4, at most 8 ICBMs and smart bombs in the air, a smart bomb counting twice) waits until the
   highest ICBM is below line 202 - 2 x wave (180 at least) of 222; an ICBM whose altitude is in the middle band
   (lines 128 to 160) may split instead into up to 3 more heads; targets are untargeted cities first, then bases, and
   at most 3 cities can fall in a wave; bombers move a pixel every 3 frames and satellites every 2, from wave 2, at the
   wave's heights, cooldowns and firing intervals; side bases' counter-missiles move 3 pixels a frame and the centre
   base's 7; at most 8 counter-missiles in the air; a burst grows to radius 13 and shrinks again over 28 steps of 5
   frames; with no counter-missiles left the attack moves at full speed, and with no city left (or 3 lost this wave)
   it ends at once.
   Adaptations (not ROM-exact): landscape 4:3 court scaled from the cabinet (3.53x vertically, 4x across); smart bomb
   evasion simplified; bursts are checked every step rather than every 5 frames. */
(function(g){
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['x','n',-1,1,20],['y','n',-1,1,20],['aim','p',0,1024,1],['fireLeft','b'],['fireCentre','b'],['fireRight','b'],['fireNearest','b']],
  groundY:706,bases:Object.freeze([70,512,954]),cities:Object.freeze([180,290,400,624,734,844]),
  ammo:10,shotSpeed:Object.freeze([680,1590,680]),maxShots:8,burstMax:48,burstGrow:1,burstHold:.17,burstShrink:1.08,
  // Cabinet line (bottom 0, ICBMs start at 222, targets at 22) to court pixels.
  scale:3.53,topLine:222,
  waveMissiles:Object.freeze([12,15,18,12,16,14,17,10,13,16,19,12,14,16,18,14,17,19,22]),
  waveSmart:Object.freeze([0,0,0,0,0,1,1,2,3,4,4,5,5,6,6,7,7,7,7]),
  icbmDelay:Object.freeze([4.8125,2.875,1.75,1.03,.625,.375,.25,.125,.0625,.04,.023,.016,.008,.004,0]),
  salvoLine:Object.freeze([202,2,180]),salvoMax:4,maxAttack:8,mirvBand:Object.freeze([128,160]),mirvMax:3,citiesPerWave:3,
  flyerFrom:2,smartFrom:6,bomberSpeed:80,satelliteSpeed:120,
  // Waves 2 to 8 on (index by wave): flier height range in cabinet lines, cooldown and firing interval in frames.
  flyerLines:Object.freeze([null,null,[148,195],[148,195],[132,163],[132,163],[100,131],[100,131],[100,131]].map(v=>v&&Object.freeze(v))),
  flyerCool:Object.freeze([0,0,240,160,128,128,96,64,32]),flyerFire:Object.freeze([0,0,128,96,64,48,32,32,16]),
  points:Object.freeze({missile:25,flyer:100,smart:125,ammo:5,city:100}),bonusCityEvery:10000,
  hitRadius:16,cursorSpeed:620,cursorFloor:80,waveDelay:2.5});
class SeededRandom{constructor(seed=1980){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const W=CONFIG.width,H=CONFIG.height,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
class MissileEngine{
 constructor(seed=1980){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.wave=0;this.bonusCities=0;this.nextBonus=CONFIG.bonusCityEvery;
  this.cities=CONFIG.cities.map(x=>({x,alive:true}));this.cursor={x:W/2,y:H/2};this.newWave();return this}
 multiplier(w=this.wave){return Math.min(6,Math.ceil(w/2))}
 newWave(){this.wave++;const i=Math.min(this.wave,CONFIG.waveMissiles.length)-1;this.toLaunch=CONFIG.waveMissiles[i];
  this.toLaunchSmart=CONFIG.waveSmart[i];this.speed=this.icbmSpeed();this.citiesLost=0;this.fullSpeed=false;
  this.bases=CONFIG.bases.map(x=>({x,alive:true,ammo:CONFIG.ammo}));this.shots=[];this.bursts=[];this.incoming=[];this.flyers=[];this.flyerTimer=0;this.state='play';this.events.push({type:'wave',wave:this.wave})}
 // One cabinet line every 1 + d frames, as court pixels a second.
 icbmSpeed(w=this.wave){const D=CONFIG.icbmDelay;return CONFIG.scale*60/(1+D[Math.min(w,D.length)-1])}
 lineY(line){return (CONFIG.topLine-line)*CONFIG.scale}
 targets(){return [...this.cities.filter(c=>c.alive).map(c=>({x:c.x,kind:'city',ref:c})),...this.bases.filter(b=>b.alive).map(b=>({x:b.x,kind:'base',ref:b}))]}
 // The cabinet's target choice: an untargeted city, else an untargeted base, else any of the nine; never more than
 // three cities lost or aimed at in one wave (then a base, or a city already aimed at).
 pick(){const R=a=>a[Math.floor(this.rng.next()*a.length)],aimed=new Set(this.incoming.filter(m=>!m.dead&&m.target).map(m=>m.target.ref));
  const cities=this.cities.filter(c=>c.alive),bases=this.bases.filter(b=>b.alive),freeC=cities.filter(c=>!aimed.has(c)),freeB=bases.filter(b=>!aimed.has(b));
  const as=(ref,kind)=>({x:ref.x,kind,ref});
  if(this.citiesLost+cities.filter(c=>aimed.has(c)).length>=CONFIG.citiesPerWave){if(freeB.length)return as(R(freeB),'base');const ac=cities.filter(c=>aimed.has(c));return ac.length?as(R(ac),'city'):as(R(this.cities),'city')}
  if(freeC.length)return as(R(freeC),'city');if(freeB.length)return as(R(freeB),'base');
  const all=[...this.cities.map(c=>as(c,'city')),...this.bases.map(b=>as(b,'base'))];return R(all)}
 // A new ICBM or smart bomb, from the top (random x) or from a point (a split head or a bomber's drop).
 launch(from,kind='missile'){const t=this.pick(),x=from?from.x:CONFIG.scale*4+this.rng.next()*(W-CONFIG.scale*8),y=from?from.y:0;
  this.incoming.push({x0:x,y0:y,x,y,tx:t.x,ty:CONFIG.groundY,kind,target:t,split:!!from});if(kind==='smart')this.toLaunchSmart--;else this.toLaunch--}
 // The cabinet's attack generator: salvos wait for the highest ICBM to come down, then at most 4 at once.
 launchAttacks(){if(this.toLaunch<=0&&this.toLaunchSmart<=0)return;const L=CONFIG.salvoLine,line=Math.max(L[2],L[0]-L[1]*this.wave);
  if(this.incoming.length&&Math.min(...this.incoming.map(m=>m.y))<this.lineY(line))return;
  const smart=this.incoming.filter(m=>m.kind==='smart').length,icbm=this.incoming.length-smart,flier=this.flyers.length?1:0;
  let atk=CONFIG.maxAttack-1-flier-icbm-smart;if(atk<0)return;const abm=atk+12-this.shots.length-this.bursts.filter(b=>b.own).length;if(abm<0)return;atk=Math.min(atk,abm);
  this.makeFlyer();
  if(this.toLaunchSmart>0){if(smart>=3)return this.launchIcbms(atk);if(smart+icbm>=5)return;if(this.toLaunch<=0||this.rng.next()<.25)return this.launch(null,'smart')}
  this.launchIcbms(atk)}
 launchIcbms(atk){if(this.toLaunch<=0)return;const smart=this.incoming.filter(m=>m.kind==='smart').length,icbm=this.incoming.length-smart,f=this.flyers[0];
  const k=CONFIG.maxAttack-1-(f?1:0)-2*smart-icbm;if(k<0)return;let n=Math.min(k+1,CONFIG.salvoMax,this.toLaunch,atk+1);
  // A bomber or satellite over the middle of the room drops instead, once its firing interval has passed.
  if(f&&f.fire>=CONFIG.flyerFire[Math.min(this.wave,8)]/60&&f.x>=192&&f.x<=W-192){f.fire=0;n=Math.min(n,CONFIG.mirvMax);for(let j=0;j<n;j++)this.launch({x:f.x,y:f.y});return}
  // An ICBM in the middle band splits into more heads.
  const top=this.incoming.reduce((a,m)=>!a||m.y<a.y?m:a,null),B=CONFIG.mirvBand;
  if(top&&top.kind==='missile'&&!top.split&&top.y>=this.lineY(B[1])&&top.y<this.lineY(B[0])){top.split=true;n=Math.min(n,CONFIG.mirvMax);for(let j=0;j<n;j++)this.launch({x:top.x,y:top.y});this.events.push({type:'split'});return}
  for(let j=0;j<n;j++)this.launch(null)}
 makeFlyer(){if(this.wave<CONFIG.flyerFrom||this.toLaunch<=0||this.flyers.length||this.flyerTimer>0)return;const w=Math.min(this.wave,8),[lo,hi]=CONFIG.flyerLines[w];
  const dir=this.rng.next()<.5?1:-1,y=this.lineY(lo+this.rng.next()*(hi-lo)),kind=this.rng.next()<.5?'bomber':'satellite';
  this.flyers.push({x:dir>0?-30:W+30,y,dir,kind,fire:0});this.events.push({type:'flyer'})}
 fire(base){const b=this.bases[base];if(!b||!b.alive||b.ammo<=0||this.state!=='play'||this.shots.length>=CONFIG.maxShots)return false;const c=this.cursor;if(c.y>CONFIG.groundY-20)return false;
  b.ammo--;this.shots.push({x0:b.x,y0:CONFIG.groundY-24,x:b.x,y:CONFIG.groundY-24,tx:c.x,ty:c.y,speed:CONFIG.shotSpeed[base]});this.events.push({type:'fire',base});return true}
 award(n){this.score+=n*this.multiplier();while(this.score>=this.nextBonus){this.nextBonus+=CONFIG.bonusCityEvery;this.bonusCities++;this.events.push({type:'bonus-city'})}}
 burstAt(x,y,own=true){this.bursts.push({x,y,t:0,own});this.events.push({type:'burst',x,y})}
 radius(b){const G=CONFIG.burstGrow,Hd=CONFIG.burstHold,S=CONFIG.burstShrink,t=b.t;return CONFIG.burstMax*(t<G?t/G:t<G+Hd?1:Math.max(0,1-(t-G-Hd)/S))}
 // As on the cabinet the crosshair stays above the desks, so counter-missiles never skim along the floor.
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  const c=this.cursor,mx=clamp(Number(input.x)||0,-1,1),my=clamp(Number(input.y)||0,-1,1);
  if(input.aim){c.x=input.aim.x;c.y=input.aim.y}else{c.x+=mx*CONFIG.cursorSpeed*dt;c.y+=my*CONFIG.cursorSpeed*dt}c.x=clamp(c.x,10,W-10);c.y=clamp(c.y,20,CONFIG.groundY-CONFIG.cursorFloor);
  if(this.state==='between'){this.timer-=dt;if(this.timer<=0)this.newWave();return}
  for(const [k,i] of [['fireLeft',0],['fireCentre',1],['fireRight',2]])if(input[k])this.fire(i);
  if(input.fireNearest){const order=[0,1,2].filter(i=>this.bases[i].alive&&this.bases[i].ammo>0).sort((a,b)=>Math.abs(this.bases[a].x-c.x)-Math.abs(this.bases[b].x-c.x));if(order.length)this.fire(order[0])}
  // No counter-missiles left: the attack comes down at full speed; with no city left or three lost, the wave ends.
  const noAbm=!this.bases.some(b=>b.alive&&b.ammo>0);if(noAbm&&!this.shots.length&&!this.bursts.some(b=>b.own))this.fullSpeed=true;
  if(noAbm&&(!this.cities.some(c=>c.alive)||this.citiesLost>=CONFIG.citiesPerWave)){this.toLaunch=0;this.toLaunchSmart=0;if(!this.flyers.length&&!this.shots.length&&!this.bursts.length){this.incoming=[];this.endWave();return}}
  // Incoming: salvos, splits and drops.
  if(this.flyerTimer>0)this.flyerTimer-=dt;this.launchAttacks();
  for(const f of this.flyers){f.x+=f.dir*(f.kind==='bomber'?CONFIG.bomberSpeed:CONFIG.satelliteSpeed)*dt;f.fire+=dt;if(f.x<-60||f.x>W+60)f.gone=true}
  const v=this.fullSpeed?this.icbmSpeed(99):this.speed;
  for(const m of this.incoming){const dx=m.tx-m.x0,dy=m.ty-m.y0,L=Math.hypot(dx,dy);
   if(m.kind==='smart'){const b=this.bursts.find(b=>Math.hypot(b.x-m.x,b.y-m.y)<this.radius(b)+40);if(b){m.x+=Math.sign(m.x-b.x||1)*v*1.4*dt}}
   m.x+=dx/L*v*dt;m.y+=dy/L*v*dt;
   if(m.y>=CONFIG.groundY){m.dead=true;this.impact(m.x)}}
  // Counter-missiles fly to the crosshair point and burst there.
  for(const s of this.shots){const dx=s.tx-s.x0,dy=s.ty-s.y0,L=Math.hypot(dx,dy);s.x+=dx/L*s.speed*dt;s.y+=dy/L*s.speed*dt;if(Math.hypot(s.x-s.x0,s.y-s.y0)>=L){s.dead=true;this.burstAt(s.tx,s.ty)}}
  for(const b of this.bursts){b.t+=dt;const r=this.radius(b);
   for(const m of this.incoming)if(!m.dead&&Math.hypot(m.x-b.x,m.y-b.y)<=r){m.dead=true;if(b.own){this.award(CONFIG.points[m.kind==='smart'?'smart':'missile']);this.events.push({type:'kill',kind:m.kind})}this.burstAt(m.x,m.y,b.own)}
   for(const f of this.flyers)if(!f.gone&&Math.hypot(f.x-b.x,f.y-b.y)<=r+14){f.gone=true;f.shot=true;if(b.own)this.award(CONFIG.points.flyer);this.events.push({type:'kill',kind:f.kind});this.burstAt(f.x,f.y,b.own)}
   if(b.t>CONFIG.burstGrow+CONFIG.burstHold+CONFIG.burstShrink)b.done=true}
  this.incoming=this.incoming.filter(m=>!m.dead);this.shots=this.shots.filter(s=>!s.dead);this.bursts=this.bursts.filter(b=>!b.done);if(this.flyers.some(f=>f.gone))this.flyerTimer=CONFIG.flyerCool[Math.min(this.wave,8)]/60;this.flyers=this.flyers.filter(f=>!f.gone);
  if(this.toLaunch<=0&&this.toLaunchSmart<=0&&!this.incoming.length&&!this.flyers.length&&!this.shots.length&&!this.bursts.length)this.endWave()}
 impact(x){this.burstAt(x,CONFIG.groundY-6,false);for(const c of this.cities)if(c.alive&&Math.abs(c.x-x)<CONFIG.hitRadius+18){c.alive=false;this.citiesLost++;this.events.push({type:'city-lost',x:c.x})}
  for(const b of this.bases)if(b.alive&&Math.abs(b.x-x)<CONFIG.hitRadius+20){b.alive=false;b.ammo=0;this.events.push({type:'base-lost',x:b.x})}}
 endWave(){const m=this.multiplier(),ammo=this.bases.reduce((a,b)=>a+(b.alive?b.ammo:0),0),cities=this.cities.filter(c=>c.alive).length;
  const bonus=(ammo*CONFIG.points.ammo+cities*CONFIG.points.city)*m;this.score+=bonus;while(this.score>=this.nextBonus){this.nextBonus+=CONFIG.bonusCityEvery;this.bonusCities++;this.events.push({type:'bonus-city'})}
  this.events.push({type:'wave-end',wave:this.wave,ammo,cities,bonus,multiplier:m});
  // Rebuild a lost city from the bonus cities in hand.
  for(const c of this.cities)if(!c.alive&&this.bonusCities>0){c.alive=true;this.bonusCities--;this.events.push({type:'city-rebuilt',x:c.x})}
  if(!this.cities.some(c=>c.alive)){this.state='end';this.events.push({type:'gameover',score:this.score});return}
  this.state='between';this.timer=CONFIG.waveDelay;this.lastBonus={ammo,cities,bonus,multiplier:m}}
 // Demo pilot: aims at the lowest incoming missile, ahead of it, and fires from the nearest base.
 pilot(){const c=this.cursor,live=this.incoming.filter(m=>m.y>40);if(!live.length)return{x:(W/2-c.x)/200,y:(H/2-c.y)/200};
  const m=live.reduce((a,b)=>b.y>a.y?b:a),dx=m.tx-m.x0,dy=m.ty-m.y0,L=Math.hypot(dx,dy),base=this.bases.filter(b=>b.alive&&b.ammo>0).sort((a,b)=>Math.abs(a.x-m.x)-Math.abs(b.x-m.x))[0];
  const fly=base?Math.hypot(base.x-m.x,CONFIG.groundY-m.y)/CONFIG.shotSpeed[this.bases.indexOf(base)]:.5,lead=fly+.45,tx=m.x+dx/L*this.speed*lead,ty=m.y+dy/L*this.speed*lead;
  const busy=this.shots.length+this.bursts.filter(b=>b.own).length>=3;return{aim:{x:tx,y:ty},fireNearest:!busy&&Math.floor(this.clock*3)%2===0}}
 snapshot(){return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,wave:this.wave,cities:this.cities.map(c=>c.alive?1:0).join(''),bases:this.bases.map(b=>b.alive?b.ammo:-1),incoming:this.incoming.length,toLaunch:this.toLaunch,toLaunchSmart:this.toLaunchSmart,bonusCities:this.bonusCities}}
}
const SpitballCommandCore={CONFIG,MissileEngine,SeededRandom};
g.SpitballCommandCore=SpitballCommandCore;if(typeof module!=='undefined')module.exports=SpitballCommandCore;
})(globalThis);
