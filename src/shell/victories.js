'use strict';
// Tiny victories (owner 2026-10-26: many more, from each game's own feats). Each finished notebook reports its engine
// events here while a real game is played (never the demo); a matching rule earns the victory once, through the save's
// own achieve(). Scribble Defender reports through save.record, which watch() listens to.
(function(g){
// Tiers like console trophies (owner 2026-10-26): bronze, silver and gold by how hard the feat is on the cabinet, and a
// platinum for every other victory of one notebook. Points add up like a gamerscore.
const TIERS=['bronze','silver','gold','platinum'],POINTS={bronze:15,silver:30,gold:90,platinum:180};
const list=[
 ['general','first-page','first page','open a notebook.','bronze'],
 ['general','eight-notebooks','locker collector','look inside eight notebooks.','silver'],
 ['general','honor-roll','honor roll','play every finished notebook.','gold'],
 ['general','ink-thousand','ink thousand','score 1,000 points.','bronze'],
 ['general','extra-credit','extra credit','all my points add up to 100,000.','gold'],
 ['scribble-defender','lab-partner','lab partner','set a classmate down safely.','bronze'],
 ['scribble-defender','one-more-page','one more page','finish a wave.','bronze'],
 ['scribble-defender','def-class-monitor','class monitor','set five classmates down in one game.','silver'],
 ['scribble-defender','def-wave-five','fifth period','reach wave five.','gold'],
 ['scribble-defender','def-bonus-ship','bonus ship','score 10,000.','silver'],
 ['gym-class-pong','pong-win','beat the coach','win a game.','silver'],
 ['gym-class-pong','pong-shutout','shutout','win 11 to 0.','gold'],
 ['gym-class-pong','pong-rally','long rally','hit the ball back ten times in one rally.','bronze'],
 ['detention-breakout','brk-through','through the wall','get the ball behind the bricks.','bronze'],
 ['detention-breakout','brk-wall','one wall down','clear the first wall.','silver'],
 ['detention-breakout','brk-perfect','perfect 896','clear both walls.','gold'],
 ['space-substitutes','ss-300','the 300 trick','hit the flying chair for 300.','gold'],
 ['space-substitutes','ss-wave','class cleared','clear a wave of substitutes.','silver'],
 ['space-substitutes','ss-extra','extra pencil','score 1,500 for an extra life.','bronze'],
 ['erasteroids','era-wave','clean sheet','clear the first wave of rocks.','bronze'],
 ['erasteroids','era-small-saucer','small saucer','hit the small saucer.','silver'],
 ['erasteroids','era-bonus','bonus ship','score 10,000.','gold'],
 ['lunch-lander','ll-land','touchdown','land the tray in one piece.','bronze'],
 ['lunch-lander','ll-soft','not a drop spilled','make a good landing.','silver'],
 ['lunch-lander','ll-x5','times five','land on a x5 table.','gold'],
 ['spitball-command','sc-wave','back row safe','survive a wave.','bronze'],
 ['spitball-command','sc-full','nobody hit','end a wave with all six desks standing.','silver'],
 ['spitball-command','sc-bonus','bonus desk','earn a bonus desk.','gold'],
 ['snack-man','sm-ghost','sent to the office','catch one of the staff.','bronze'],
 ['snack-man','sm-1600','1,600','catch all four staff on one slice of pizza.','gold'],
 ['snack-man','sm-board','every last quarter','collect every quarter in the halls.','silver'],
 ['recess-zone','rz-tank','first tank','destroy a tank.','bronze'],
 ['recess-zone','rz-super','supertank','destroy a supertank.','silver'],
 ['recess-zone','rz-saucer','saucer spotted','hit the saucer.','gold'],
 ['galgebra','ga-flag','crown taken','shoot down a flagship.','silver'],
 ['galgebra','ga-800','800','shoot both escorts, then the flagship.','gold'],
 ['galgebra','ga-wave','solved','clear the formation.','bronze'],
 ['centigrade','cg-900','up close','shoot the spider at close range for 900.','gold'],
 ['centigrade','cg-scorpion','red pen confiscated','shoot the scorpion.','silver'],
 ['centigrade','cg-wave','all graded','clear a whole centipede.','bronze'],
 ['froggology','fg-fly','fly catcher','bring a frog home to the jar with the fly.','bronze'],
 ['froggology','fg-lady','lab partner','carry the lady frog home.','silver'],
 ['froggology','fg-jars','full shelf','fill all five jars.','gold'],
 ['home-ec-scramble','he-carry','special delivery','carry two or more enemies down on one ingredient.','gold'],
 ['home-ec-scramble','he-crush','flattened','drop an ingredient on an enemy.','bronze'],
 ['home-ec-scramble','he-stage','order up','finish every burger on the page.','silver'],
 ['testpest','tp-750','lucky pom-pom','shoot a pom-pom worth 750.','silver'],
 ['testpest','tp-zap','pest control','wipe out five bugs with one superzapper.','gold'],
 ['testpest','tp-warp','down the tunnel','clear a level and warp to the next.','bronze'],
 ['quiz','qx-slow','slow and steady','claim a tenth of the sheet in one slow shape.','bronze'],
 ['quiz','qx-90','top marks','pass a level with 90% claimed.','silver'],
 ['quiz','qx-split','divide and conquer','split the two scribbles apart.','gold'],
 ['dunce-kong','dk-800','triple jump','jump three things at once for 800.','silver'],
 ['dunce-kong','dk-mallet','shop class','smash something with the mallet for 800.','bronze'],
 ['dunce-kong','dk-rivets','loose tacks','pull all eight tacks and drop Kong.','gold'],
 ['q-nerd','qn-coily','snake charmer','ride a frisbee and lure the jump rope off the edge.','silver'],
 ['q-nerd','qn-eraser','caught erasing','catch one of the chalkboard erasers.','bronze'],
 ['q-nerd','qn-level','whole level','finish all four rounds of a level.','gold'],
 ['dig-doug','dd-crush','heavy lunch','drop one lunchbox on two at once.','gold'],
 ['dig-doug','dd-dragon','hot air','pop a dragon from the side.','bronze'],
 ['dig-doug','dd-veggie','eat your vegetables','pick up the bonus vegetable.','silver'],
 ['class-of-2084','rb-family','the whole family','earn the 5,000 rescue bonus in one wave.','silver'],
 ['class-of-2084','rb-all','nobody left behind','clear a wave with every classmate saved.','gold'],
 ['class-of-2084','rb-brain','see the principal','clear a wave with the principals.','silver'],
 ['jock-joust','jj-air','interception','catch a football in the air.','bronze'],
 ['jock-joust','jj-ptero','dino down','hit the pterodactyl in its open mouth.','gold'],
 ['jock-joust','jj-survive','still standing','earn the survival wave bonus.','silver'],
 ['mystery-meat-time','mm-1000','ten in a row','hit ten chefs in one life for 1,000.','silver'],
 ['mystery-meat-time','mm-manhole','watch your step','lure a chef into an open manhole.','bronze'],
 ['mystery-meat-time','mm-close','brain freeze','eat the cone with under two seconds left.','gold'],
 ['hall-patrol','hp-average','ahead of the bell','finish a section under the average time.','silver'],
 ['hall-patrol','hp-course','beginner course','reach point Z of the beginner course.','gold'],
 ['hall-patrol','hp-formation','clean sweep','shoot down a whole formation of three UFOs.','bronze'],
 ['term-paperboy','tp-perfect','perfect day','deliver to every subscriber in one day.','silver'],
 ['term-paperboy','tp-targets','bullseye','hit every target on a training course.','silver'],
 ['term-paperboy','tp-week','seven days a week','finish the Sunday training course.','gold'],
 ['locker-gauntlet','lg-principal','see you later','send the principal away with the bell.','silver'],
 ['locker-gauntlet','lg-shortcut','shortcut','take a stairwell that skips ahead.','bronze'],
 ['locker-gauntlet','lg-deeper','the lockers go deeper','make it past level 8.','gold'],
 ['scribble-defender','plat-scribble-defender','defender of the margins','earn every other tiny victory in this notebook.','platinum'],
 ['gym-class-pong','plat-gym-class-pong','varsity letter','earn every other tiny victory in this notebook.','platinum'],
 ['detention-breakout','plat-detention-breakout','time served','earn every other tiny victory in this notebook.','platinum'],
 ['space-substitutes','plat-space-substitutes','class dismissed','earn every other tiny victory in this notebook.','platinum'],
 ['erasteroids','plat-erasteroids','spotless','earn every other tiny victory in this notebook.','platinum'],
 ['lunch-lander','plat-lunch-lander','lunch champion','earn every other tiny victory in this notebook.','platinum'],
 ['spitball-command','plat-spitball-command','no more spitballs','earn every other tiny victory in this notebook.','platinum'],
 ['snack-man','plat-snack-man','hall legend','earn every other tiny victory in this notebook.','platinum'],
 ['recess-zone','plat-recess-zone','recess is over','earn every other tiny victory in this notebook.','platinum'],
 ['galgebra','plat-galgebra','proof complete','earn every other tiny victory in this notebook.','platinum'],
 ['centigrade','plat-centigrade',"straight A's",'earn every other tiny victory in this notebook.','platinum'],
 ['froggology','plat-froggology','biology honors','earn every other tiny victory in this notebook.','platinum'],
 ['home-ec-scramble','plat-home-ec-scramble',"chef's special",'earn every other tiny victory in this notebook.','platinum'],
 ['testpest','plat-testpest','exterminator','earn every other tiny victory in this notebook.','platinum'],
 ['quiz','plat-quiz','perfect score','earn every other tiny victory in this notebook.','platinum'],
 ['dunce-kong','plat-dunce-kong','top of the ladder','earn every other tiny victory in this notebook.','platinum'],
 ['q-nerd','plat-q-nerd','nerd of the year','earn every other tiny victory in this notebook.','platinum'],
 ['dig-doug','plat-dig-doug','groundskeeper','earn every other tiny victory in this notebook.','platinum'],
 ['class-of-2084','plat-class-of-2084','class president','earn every other tiny victory in this notebook.','platinum'],
 ['jock-joust','plat-jock-joust','team captain','earn every other tiny victory in this notebook.','platinum'],
 ['mystery-meat-time','plat-mystery-meat-time','food critic','earn every other tiny victory in this notebook.','platinum'],
 ['hall-patrol','plat-hall-patrol','hall of fame','earn every other tiny victory in this notebook.','platinum'],
 ['term-paperboy','plat-term-paperboy','paperboy of the month','earn every other tiny victory in this notebook.','platinum'],
 ['locker-gauntlet','plat-locker-gauntlet','last one out','earn every other tiny victory in this notebook.','platinum']
].map(([game,id,label,note,tier])=>Object.freeze({game,id,label,note,tier,points:POINTS[tier]}));
const byId=Object.fromEntries(list.map(v=>[v.id,v]));
// Per-game run counters, reset when a new engine starts or a game ends.
const runs={};
const run=(game,engine)=>{let r=runs[game];if(!r||r.engine!==engine)r=runs[game]={engine,n:{}};return r.n};
const rules={
 'gym-class-pong':(ev,e,n,win)=>{if(ev.type==='hit'&&ev.side==='left'&&++n.rally>=10)win('pong-rally');if(ev.type==='point')n.rally=0;if(ev.type==='gameover'&&ev.winner==='left'){win('pong-win');if(!e.right?.score)win('pong-shutout')}},
 'detention-breakout':(ev,e,n,win)=>{if(ev.type==='top')win('brk-through');if(ev.type==='wall'&&ev.number>=2)win('brk-wall');if(ev.type==='gameover'&&ev.cleared)win('brk-perfect')},
 'space-substitutes':(ev,e,n,win)=>{if(ev.type==='ufo-hit'&&ev.points===300)win('ss-300');if(ev.type==='cleared')win('ss-wave');if(ev.type==='extra')win('ss-extra')},
 erasteroids:(ev,e,n,win)=>{if(ev.type==='wave'&&ev.wave>=2)win('era-wave');if(ev.type==='kill'&&ev.saucer==='small')win('era-small-saucer');if(ev.type==='extra')win('era-bonus')},
 'lunch-lander':(ev,e,n,win)=>{if(ev.type==='landed'){win('ll-land');if(ev.kind==='good')win('ll-soft');if(ev.bonus>=5)win('ll-x5')}},
 'spitball-command':(ev,e,n,win)=>{if(ev.type==='wave-end'&&ev.cities>0){win('sc-wave');if(ev.cities>=6)win('sc-full')}if(ev.type==='bonus-city')win('sc-bonus')},
 'snack-man':(ev,e,n,win)=>{if(ev.type==='ghost-eaten'){win('sm-ghost');if(ev.points>=1600)win('sm-1600')}if(ev.type==='cleared')win('sm-board')},
 'recess-zone':(ev,e,n,win)=>{if(ev.type==='kill'){if(ev.kind==='tank')win('rz-tank');if(ev.kind==='super')win('rz-super');if(ev.kind==='saucer')win('rz-saucer')}},
 galgebra:(ev,e,n,win)=>{if(ev.type==='kill'&&ev.kind==='flag'&&ev.diving)win('ga-flag');if(ev.type==='kill'&&ev.points===800)win('ga-800');if(ev.type==='cleared')win('ga-wave')},
 centigrade:(ev,e,n,win)=>{if(ev.type==='spider'&&ev.points===900)win('cg-900');if(ev.type==='scorpion')win('cg-scorpion');if(ev.type==='cleared')win('cg-wave')},
 'froggology':(ev,e,n,win)=>{if(ev.type==='home'&&ev.fly)win('fg-fly');if(ev.type==='home'&&ev.lady)win('fg-lady');if(ev.type==='cleared')win('fg-jars')},
 'home-ec-scramble':(ev,e,n,win)=>{if(ev.type==='carry'&&ev.count>=2)win('he-carry');if(ev.type==='crush')win('he-crush');if(ev.type==='cleared')win('he-stage')},
 'testpest':(ev,e,n,win)=>{if(ev.type==='kill'&&ev.kind==='fuseball'&&ev.points===750)win('tp-750');if(ev.type==='zap'&&ev.count>=5)win('tp-zap');if(ev.type==='cleared')win('tp-warp')},
 'quiz':(ev,e,n,win)=>{if(ev.type==='claim'&&ev.slow&&ev.share>=10)win('qx-slow');if(ev.type==='cleared'&&ev.percent>=90)win('qx-90');if(ev.type==='split')win('qx-split')},
 'dunce-kong':(ev,e,n,win)=>{if(ev.type==='jumpover'&&ev.count>=3)win('dk-800');if(ev.type==='smash'&&ev.points===800)win('dk-mallet');if(ev.type==='rivetsDone')win('dk-rivets')},
 'q-nerd':(ev,e,n,win)=>{if(ev.type==='coily')win('qn-coily');if(ev.type==='catch')win('qn-eraser');if(ev.type==='level')win('qn-level')},
 'dig-doug':(ev,e,n,win)=>{if(ev.type==='crush'&&ev.count>=2)win('dd-crush');if(ev.type==='pop'&&ev.kind==='fygar'&&ev.horizontal)win('dd-dragon');if(ev.type==='bonus')win('dd-veggie')},
 'class-of-2084':(ev,e,n,win)=>{if(ev.type==='rescue'&&ev.points>=5000)win('rb-family');if(ev.type==='cleared'&&ev.saved>0&&ev.lost===0&&!e.humans.length)win('rb-all');if(ev.type==='cleared'&&ev.brain)win('rb-brain')},
 'jock-joust':(ev,e,n,win)=>{if(ev.type==='egg'&&ev.air)win('jj-air');if(ev.type==='ptero')win('jj-ptero');if(ev.type==='bonus'&&ev.kind==='survival')win('jj-survive')},
 'mystery-meat-time':(ev,e,n,win)=>{if(ev.type==='hit'&&ev.points>=1000)win('mm-1000');if(ev.type==='manhole')win('mm-manhole');if(ev.type==='cone'&&ev.melt<2)win('mm-close')},
 'hall-patrol':(ev,e,n,win)=>{if(ev.type==='section'&&ev.time<ev.par)win('hp-average');if(ev.type==='course')win('hp-course');if(ev.type==='formation')win('hp-formation')},
 'term-paperboy':(ev,e,n,win)=>{if(ev.type==='perfect')win('tp-perfect');if(ev.type==='report'&&e.targets?.every(t=>t.hit))win('tp-targets');if(ev.type==='week')win('tp-week')},
 'locker-gauntlet':(ev,e,n,win)=>{if(ev.type==='kill'&&ev.kind==='death')win('lg-principal');if(ev.type==='exit'&&ev.skip)win('lg-shortcut');if(ev.type==='level'&&ev.level>8)win('lg-deeper')}
};
let save=null;
function earn(id){if(save)save.achieve(id)}
function general(){if(!save)return;const played=save.catalog.notebooks.filter(n=>n.available);if(played.every(n=>save.stats(n.id).runs>0))earn('honor-roll');if(save.total()>=100000)earn('extra-credit')}
// Called by each finished notebook's play page for every engine event of a real game.
function event(game,ev,engine){const rule=rules[game];if(!rule||!save)return;const n=run(game,engine);n.rally??=0;rule(ev,engine,n,earn);if(ev.type==='gameover')delete runs[game]}
// Scribble Defender's notebook reports kills, rescues, waves and deaths through save.record.
// Every victory, also the ones the save earns itself (first page, ink thousand, one more page), shows its slip once.
// Earned dates sit beside the earned ids (progress.victoryDates, id: yyyy-mm-dd); saves from before have none and
// show "earned" without a date. A notebook's platinum follows its last other victory, also for saves that already
// qualify when they load.
const has=(s,id)=>s.progress.achievements.includes(id),today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const platinumDue=(s,game)=>!!game&&game!=='general'&&!!byId['plat-'+game]&&!has(s,'plat-'+game)&&list.every(v=>v.game!==game||v.tier==='platinum'||has(s,v.id));
const date=(s,id)=>{const d=s.progress.victoryDates&&typeof s.progress.victoryDates==='object'&&!Array.isArray(s.progress.victoryDates)?s.progress.victoryDates:(s.progress.victoryDates={});if(byId[id]&&!d[id])d[id]=today()};
function watch(s){save=s;const achieve=s.achieve.bind(s);date(s,'');for(const game of new Set(list.map(v=>v.game)))if(platinumDue(s,game)){date(s,'plat-'+game);achieve('plat-'+game)}
  s.achieve=id=>{const fresh=!has(s,id);if(fresh)date(s,id);achieve(id);if(fresh&&has(s,id)){g.No2?.victoryEarned?.(byId[id]);if(platinumDue(s,byId[id]?.game))s.achieve('plat-'+byId[id].game)}};const record=s.record.bind(s);s.record=(id,type,data={})=>{record(id,type,data);
  if(id==='scribble-defender'){const n=(runs[id]??={n:{saved:0,waves:0}}).n;if(type==='saved'&&++n.saved>=5)earn('def-class-monitor');if(type==='tally'&&++n.waves>=4)earn('def-wave-five');if((data.score||0)>=10000)earn('def-bonus-ship');if(type==='gameover')delete runs[id]}
  if(type==='gameover')general()}}
g.No2Victories={list,byId,TIERS,POINTS,event,watch,points:s=>list.reduce((t,v)=>t+(has(s,v.id)?v.points:0),0)};
})(globalThis);
