'use strict';
/* Locker Gauntlet: Atari Gauntlet (1985) rules, drawn as the school's locker hallways going deeper and deeper.
   Four heroes to pick, as the cabinet's (owner 2026-10-30): the jock (Warrior), the lacrosse captain (Valkyrie), the science
   kid (Wizard) and the cross-country runner (Elf), each with the cabinet's strengths in CONFIG.heroes.
   Rules follow the original cabinet: top-down maze levels that scroll with the player; walls (lockers), doors (hall
   gates) that a key opens, the whole connected gate at once, and exits to the next level, some exits skipping ahead
   (EXIT TO 4, 6, 7, 8); health counts down one point every second and on every monster hit, and the game ends at 0
   health (no lives); food (lunch bags) restores 100 health and a shot destroys it ("the jock shot the lunch.");
   treasure (lunch money) 100, keys 100, potions (school bells) 100; a potion is carried and its magic clears every
   monster on screen, Death too, or a shot potion goes off where it lies with a smaller blast; generators (brick
   offices) spawn their monster near the player and come in three strengths: a shot knocks them down a level and the
   last one destroys them; monsters come in three levels too, each shot takes one level off; ghosts (hooded hall pass
   ghosts) hit once for heavy damage and vanish; grunts (hall monitors) club; demons (dodgeball kids) club and throw
   fireballs (dodgeballs) that hurt more; lobbers (paper wad kids) keep their distance and lob over the lockers;
   sorcerers (substitute teachers) fade out and cannot be hit while invisible; Death (the principal) drains health on
   touch until he has taken 200 and then leaves, and only a potion kills him; fighting hand to hand by walking into a
   monster; holding fire stands the hero still and throws in the stick's direction, one ball in the air at a time;
   the narrator's lines appear as notes ("the jock needs lunch, badly.", "the jock is about to flunk.").
   Scoring (cabinet table, the same at every monster level): a monster killed by a thrown ball 5 (a ghost 10), hand
   to hand 25 (ghosts cannot be fought hand to hand), by magic 10; a generator 10 for each hit; Death 1 a hit, and
   killed by magic he pays the next value of his seven-step cycle 1,000, 2,000, 1,000, 4,000, 2,000, 6,000, 8,000,
   each hit on him also moving it on; treasure, keys and potions 100. Damage by monster level: ghost 10 20 30, grunt, demon
   and sorcerer 5 8 10, a demon's fireball 10, a lobber's rock 3.
   Adaptations (not ROM-exact): there are no credits, so the "insert coin" health top-up is replaced by nothing and
   the game starts with 1,000 health instead of a credit's worth; sixteen hand-made levels on a 48 px tile grid (school
   halls of our own, not the cabinet's mazes), repeated after level 16 with every generator one level stronger; each level
   starts crowded with every generator's monsters standing round it, and deeper levels make monsters walk faster and
   generators spawn more often (owner 2026-10-30: the game was too easy). Always four players (owner 2026-10-30): the three
   heroes the player did not pick are computer classmates who keep near the player, throw at and fight monsters, eat a
   lunch only when they need it and leave keys, money and bells to the player; their kills score nothing, a classmate at
   0 health flunks out and is back on the next level with 600, and the game ends when the player's health runs out.
   Monsters go for the nearest player, straight at him and round a locker by the next of the eight directions. Sources (checked 2026-10-26): the point and damage
   table is Atari's own Gauntlet Player Tips sheet (1985, archive.org gauntlet_player_tips_ptm, the cabinet's monster
   screens): magic 10, shot 5 (ghost 10), fighting 25, generator 10, Death 1 a shot and "????" by magic, damage as above,
   treasure 100; the operator manual's default is 600 health a coin; Death's magic cycle is not on the sheet and no program
   source is public: StrategyWiki's Gauntlet enemies page ("shoot death exactly 6 times" for 8,000) and the Arcade
   Quartermaster give the seven steps used here (core 0.4.2, 2026-10-31), Falkentyne's Gauntlet FAQ (GameFAQs 13973,
   "I believe") eight (a second 2,000), MAME's history.dat 1,000-2,000-1,000-4,000-1,000-6,000-1,000-8,000; lobbers stop
   lobbing and run once a player is within about three squares (StrategyWiki); no source
   gives potion or key points for the arcade, 100 kept; one generator look for every monster kind; no thieves,
   poisoned food, invisibility or other special potions, and no shot-reflecting walls; speeds, damage and spawn
   timings tuned by eye at 120 Hz. */
(function(g){
const CONFIG=Object.freeze({version:'0.4.2',width:1024,height:768,step:1/120,record:[['axis','n',-1,1,20],['axisY','n',-1,1,20],['fire','b'],['magic','b'],['hero','n',0,4,4]],
  tile:48,top:64,viewW:1024,viewH:704,
  health:700,drainEvery:1,food:100,lowHealth:500,dyingHealth:200,
  points:Object.freeze({shot:Object.freeze({ghost:10,grunt:5,demon:5,lobber:5,sorcerer:5}),melee:25,magic:10,deathHit:1,generator:10,treasure:100,key:100,potion:100}),deathPoints:Object.freeze([1000,2000,1000,4000,2000,6000,8000]),
  damage:Object.freeze({ghost:Object.freeze([10,20,30]),grunt:Object.freeze([5,8,10]),demon:Object.freeze([5,8,10]),lobber:Object.freeze([3,3,3]),sorcerer:Object.freeze([5,8,10]),fireball:Object.freeze([10,10,10]),rock:Object.freeze([3,3,3])}),
  speed:Object.freeze({ghost:110,grunt:85,demon:95,lobber:75,sorcerer:105,death:120}),
  playerSpeed:160,playerR:17,monsterR:18,shotSpeed:540,shotR:9,hitEvery:.5,meleeEvery:.25,
  deathDrain:60,deathMax:200,spawnEvery:Object.freeze([.8,1.8]),spawnRange:9,activeRange:15,maxMonsters:90,
  fireEvery:Object.freeze([1.5,3]),fireballSpeed:300,lobEvery:Object.freeze([2,3.5]),lobTime:1.1,lobHit:34,lobNear:3,lobFar:7,
  sorcererSeen:Object.freeze([1.2,2]),sorcererHidden:Object.freeze([.8,1.4]),blast:3.5,exitPause:1,sayTime:2.6,
  genBase:Object.freeze([1,1,2,2,2,2,3,3,2,2,2,3,3,3,3,3]),
  // The three classmates (owner 2026-10-30): they share the player's screen, catch up after allyAway seconds off it, and one
  // who flunked out is back on the next level with allyBack health (how each plays: heroes[].ally).
  crowd:3,allyAway:4,allyBack:600,
  // Deeper is harder: monsters walk ramp faster and generators spawn ramp more often each level, up to rampMax.
  ramp:.02,rampMax:20,
  // The four heroes of the cabinet's player select (owner 2026-10-30), as students; their strengths follow the cabinet's
  // ratings: armor takes that share off every monster hit, shot and fight are the levels one throw or one blow takes off,
  // magic the levels a bell takes off every monster on screen (3 clears them all), speed how fast they walk.
  heroes:Object.freeze([
   // ally: how each plays as a computer classmate (owner 2026-10-31: like another player at the cabinet, never a follower):
   // style (below), react the seconds before throwing at a new target, range the squares they throw across, food the
   // health under which they go for a lunch.
   Object.freeze({id:'warrior',who:'the jock',armor:.2,shot:2,fight:3,magic:1,speed:140,shotSpeed:540,ally:Object.freeze({style:'brawler',react:.5,range:5,food:450})}),
   Object.freeze({id:'valkyrie',who:'the captain',armor:.3,shot:1,fight:2,magic:2,speed:160,shotSpeed:540,ally:Object.freeze({style:'guard',react:.45,range:6,food:600})}),
   Object.freeze({id:'wizard',who:'the science kid',armor:0,shot:1,fight:1,magic:3,speed:160,shotSpeed:540,ally:Object.freeze({style:'explorer',react:.6,range:7,food:600})}),
   Object.freeze({id:'elf',who:'the runner',armor:.1,shot:1,fight:2,magic:2,speed:190,shotSpeed:700,ally:Object.freeze({style:'scout',react:.4,range:6,food:850})})])});
class SeededRandom{constructor(seed=1985){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const LEVELS=Object.freeze([
 ['the front hall',[
  '################################',
  '#@.....#.......g.......#.......#',
  '#......#...............#...$...#',
  '#..f...#....#######....#.......#',
  '#......=....#.....#....##=######',
  '####.###....#..$..#............#',
  '#......#....#..k..#....g.......#',
  '#..g...#....###=###............#',
  '#......#.......................#',
  '#......########....#########...#',
  '#..............#...#...f...#...#',
  '#.......$......#...#.......#...#',
  '######..####...#...####=####...#',
  '#...........g..#...............#',
  '#..k...........#.......g.......#',
  '#......#########...........#####',
  '#..f...#.......#####.......#...#',
  '#......=...$...#.4.=...p...=.E.#',
  '#......#.......#...#.......#...#',
  '####.######..#######...g...#...#',
  '#..$.......g..........$...f....#',
  '################################']],
 ['the science wing',[
  '################################',
  '#$...r.#...........#.....r....$#',
  '#......#..f....g...#...........#',
  '#..k...#...........=...#####...#',
  '#......#####..######...#...#...#',
  '###=####...........#...#.p.#...#',
  '#..........r.......#...#...#...#',
  '#....#######...#...#...##=##...#',
  '#....#.....#...#...............#',
  '#.@..#..$..=...#.......g.......#',
  '#....#.....#...#########.......#',
  '#.k..#######...#.......#####=###',
  '#..............#...k...#.......#',
  '####.....g.....#.......#...$...#',
  '#..#...........###=#####...r...#',
  '#..#...######..........#.......#',
  '#f.#...#.$.....r.......#.......#',
  '#..#...#.......#####...###=#####',
  '#..=...#.......#...#...#.....E.#',
  '#..#...#...f...#.6.=...=.......#',
  '#..#...........#...#...#...$...#',
  '################################']],
 ['the gym hallway',[
  '################################',
  '#@........#.........d.........$#',
  '#.........#....................#',
  '#...f.....=.........#####......#',
  '#.........#.........#...#......#',
  '#####..####....g....#.k.#......#',
  '#.........#.........##=##......#',
  '#...$.....#....................#',
  '#.........######...........d...#',
  '#...k...........#..............#',
  '#...............#...#######....#',
  '#####=######....#...#.....#....#',
  '#..........#....#...#..f..#....#',
  '#..d.......#........#.....#....#',
  '#..........#........###=###....#',
  '#....p.....#....r..............#',
  '#..........######.........$....#',
  '#..........#....#..............#',
  '#.......$..=..E.#####=######...#',
  '#..........#....#..........#...#',
  '#####.######....#...7......#...#',
  '#..f..........r.#..........=...#',
  '################################']],
 ['the cafeteria',[
  '################################',
  '#@.....#....l...........#.....$#',
  '#......#................#......#',
  '#..f...=.....f....f.....=..k...#',
  '#......#................#......#',
  '#####..#######....#######......#',
  '#......#.................#######',
  '#..l...#...$..........$..#.....#',
  '#......#.................=..p..#',
  '#......###########=#######.....#',
  '#......#.......#.........#######',
  '#..k...#...f...#....l....#.....#',
  '#......#.......#.........#..E..#',
  '#......####=####.........#.....#',
  '#..........................f...#',
  '######.......########.......####',
  '#....#....$..#.....#..........d#',
  '#..r.#.......#..p..#...........#',
  '#....=.......=.....#....l......#',
  '#....#.......#.....#...........#',
  '#.f..#...l...#..$..#......f....#',
  '#$...#.......#.....#..........$#',
  '################################']],
 ['the music wing',[
  '################################',
  '#@...#.........s.........#....$#',
  '#....#...................#.....#',
  '#....#...#####.....#####.#..k..#',
  '#.f..#...#.$.#.....#.p.#.#.....#',
  '#....#...#...#.....#...#.###=###',
  '#....=...##=##.....##=##.......#',
  '#....#.........................#',
  '#....#####......s.......####...#',
  '#............#######....#..#...#',
  '#..k.........#.....#....#8.#...#',
  '#####...g....#..$..#....#..#...#',
  '#............#.....#....##=#...#',
  '#....####....###=###...........#',
  '#....#..#..................s...#',
  '#.f..#$.#....r.................#',
  '#....#..#.......#########=######',
  '#....##=#.......#..............#',
  '#...............#..$...f...s...#',
  '#.......s.......=..............#',
  '#...$...........#..........E...#',
  '#..........f....#..............#',
  '################################']],
 ['the basement',[
  '################################',
  '#@.....#...........#..........$#',
  '#......#....d......#..X........#',
  '#..f...#...........#...........#',
  '#......####=####...######=######',
  '#......#.......#...............#',
  '#..k...#...$...#....g......l...#',
  '#......#.......#...............#',
  '####=###########.....####......#',
  '#..........#.........#..#......#',
  '#...r...k..#.........#p.#......#',
  '#..........#....s....#..#......#',
  '#..........=.........##=#......#',
  '#....$.....#...................#',
  '#######=####.......X...........#',
  '#.........#....................#',
  '#..f......#....######=######...#',
  '#.........#....#...........#...#',
  '#....k....#....#....E......#...#',
  '#.........=....#...........#.f.#',
  '#....p....#....#.....$.....#...#',
  '#.........#........r...........#',
  '################################']],
 ['the boiler room',[
  '################################',
  '#@.#.......#.......#.......#..$#',
  '#..#...G...#...R...#...D...#...#',
  '#..#.......#.......#.......#...#',
  '#..##=#######.#########.####...#',
  '#..........................f...#',
  '#..k...........................#',
  '#####.....#######=#######......#',
  '#.p.#.....#.............#..L...#',
  '#...=.....#....X........#......#',
  '#...#.....#.............#......#',
  '#####.....#.....$.......#####=##',
  '#.........#######=#######......#',
  '#..f...........................#',
  '#..........S..............k....#',
  '#######...........#########....#',
  '#.....#....######.#.......#....#',
  '#..$..=....#..f.#.#...E...=....#',
  '#.....#....#....#.#.......#....#',
  '#..k..#....#..p.#.#########..g.#',
  '#.....#....##=###..............#',
  '#.....#.........r.........$...f#',
  '################################']],
 ['the old wing',[
  '################################',
  '#@........#$$$$$$$$#..........k#',
  '#..k......#$$$$$$$$#...........#',
  '#...f.....#$$$$$$$$#...G.......#',
  '#.........####==####...........#',
  '#####=#####............#####=###',
  '#.........#....D.......#.......#',
  '#..k......#............#...p...#',
  '#.........#............#.......#',
  '#....R....######..######.......#',
  '#.........#............#########',
  '#.........=.....X......=.......#',
  '#.........#............#...S...#',
  '#....f....######..######.......#',
  '#.........#.....k......#.......#',
  '#######=###....L.......#...f...#',
  '#.........#............###=#####',
  '#..p......#............#.......#',
  '#.........#####=########...E...#',
  '#.....$...#..$...$...$.#.......#',
  '#.........#............#.......#',
  '#..k......=.......X....=..$..f.#',
  '################################']],
 ['the library',[
  '################################',
  '#@.....#..........g...........$#',
  '#......#.######.######.######..#',
  '#..f...#.......................#',
  '#......#.######.######.######..#',
  '#..k...=.....r.........g.......#',
  '#......#.######.######.######..#',
  '###=####.......................#',
  '#..............l.......####=####',
  '#.######.######.######.#.......#',
  '#..........$...........#..p..$.#',
  '#.######.######.######.#.......#',
  '#..g...................#########',
  '#.######.######.######.........#',
  '#.......f........r.....#####...#',
  '#.######.######.######.#...#...#',
  '#......................=.E.#.k.#',
  '######=#######.........#...#...#',
  '#.....#.....#..s.......#####...#',
  '#..$..#..p..#...............f..#',
  '#.....=.....#.....$.....G......#',
  '################################']],
 ['the auditorium',[
  '################################',
  '#@...#....................#...$#',
  '#....#..g.....D......g....#....#',
  '#.f..#....................#..k.#',
  '#....#.##.##.##.##.##.##..#....#',
  '#....#....................##=###',
  '#..k.#.##.##.##.##.##.##.......#',
  '#....=.........$...............#',
  '#....#.##.##.##.##.##.##...r...#',
  '######.............k...f.......#',
  '#....#.##.##.##.##.##.##.......#',
  '#.$..#.........l...............#',
  '#....#.##.##.##.##.##.##.......#',
  '#....#.........................#',
  '#.p..#######=##########=########',
  '#....#.........#..........#....#',
  '#....#..r...$..#...s......=..E.#',
  '#....=.........#..........#....#',
  '#....#....f....#..k..p....#....#',
  '#....#.........=..........#..f.#',
  '#..g.#....k....#....$.....#....#',
  '################################']],
 ['the locker room',[
  '################################',
  '#@..#.....#.....#.....#.....#.$#',
  '#...#..r..#..g..#..r..#..d..#..#',
  '#.f.#.....#.....#.....#.....#..#',
  '#...##=####.###.##=####.###.#..#',
  '#..............................#',
  '#..k.......$.........f.......k.#',
  '####.###.###=####.###.###=######',
  '#......#.....#.......#.....#...#',
  '#..l...#..p..#...G...#..$..#.f.#',
  '#......=.....#.......=.....#...#',
  '#......#.....#.......#.....#...#',
  '######.#######.....###########.#',
  '#..............................#',
  '#....$........d..........r.....#',
  '#..............................#',
  '###=######.########.######=#####',
  '#........#.#......#.#..........#',
  '#..f..p..#.#..k...#.#....E.....#',
  '#........#.#......#.#..........#',
  '#$.......=.........=..........$#',
  '################################']],
 ['the art room',[
  '################################',
  '#@........#.......#.......#...$#',
  '#.........#...g...#...r...#....#',
  '#...f.....#.......#.......#.k..#',
  '#.........##.###.###.###.##....#',
  '#....k.........................#',
  '#.........##.###.###.###.##....#',
  '######=####.......#.......######',
  '#.........#...$...#...l...#....#',
  '#..$......#.......#.......=.p..#',
  '#.........#.......#.......#....#',
  '#..............................#',
  '#.......#######.....#######....#',
  '#.......#.....#..S..#.....#....#',
  '#...f...#..$..#.....#..f..#..d.#',
  '#.......#.....#.....#.....#....#',
  '#.......###=###.....###=###....#',
  '######=########.....############',
  '#.........................#..E.#',
  '#...g.....p.......$.......=....#',
  '#.....................f...#...$#',
  '################################']],
 ['the chemistry lab',[
  '################################',
  '#@......#................#....$#',
  '#.......#..###..###..###.#.....#',
  '#..f....#..#d#..#r#..#d#.#..k..#',
  '#.......#..#.#..#.#..#.#.#.....#',
  '#..k....=......................#',
  '#.......#..###..###..###.###=###',
  '####=####......................#',
  '#..............$...............#',
  '#...###..###..###..###..###....#',
  '#...#l#..#.#..#p#..#.#..#r#....#',
  '#..............................#',
  '#..............X...............#',
  '######=#####......######=#######',
  '#..........#......#............#',
  '#....g.....#..f...#.....s......#',
  '#..$.......#......#............#',
  '#..........=......=.....k......#',
  '#####=######......#########=####',
  '#.........$....f.......#....E..#',
  '#..p...................=......$#',
  '################################']],
 ['the attic',[
  '################################',
  '#@.#.....#.....#....#.......#.$#',
  '#..#..g..#..r..#.d..#...l...#..#',
  '#..#.....#.....#....#.......#..#',
  '#..###=######=####=######=###..#',
  '#..............................#',
  '#..............................#',
  '#####.####=#########=####.######',
  '#...#.#.......#.......#.#......#',
  '#.p.#.#...G...#...D...#.#..$...#',
  '#...#.#.......#.......#.#......#',
  '#...=.###.#####.#####.###......#',
  '#...#..........................#',
  '#####.......p......X.......f...#',
  '#..........................#####',
  '#..$...######=##=######....#.E.#',
  '#......#..............#....=...#',
  '#..r...#..k...$...f...#....#...#',
  '#......#..............#....#####',
  '#..f...#####......#####.....s..#',
  '#.....................$........#',
  '################################']],
 ['the front office',[
  '################################',
  '#@.....=.......#.......=......$#',
  '#......#...g...#...r...#.......#',
  '#..f...#.......#.......#...k...#',
  '#......#.......#.......#.......#',
  '###.#####.###.###.###.#####.####',
  '#..............................#',
  '#..............................#',
  '#.##########..#####..#########.#',
  '#.#........#..#...#..#.......#.#',
  '#.#.L..p...#..=.X.=..#.p...D.#.#',
  '#.#........#..#...#..#.......#.#',
  '#.####=#####..#####..####=####.#',
  '#..............................#',
  '#....f........$.........$......#',
  '#..............................#',
  '######.###########.######.######',
  '#....#.#.........#.#....#.#....#',
  '#.k..#.#...R.....#.#.$..#.=..E.#',
  '#....=.#.........=.#....#.#....#',
  '#.$..#.#....f....#.#..f.#.#...$#',
  '################################']],
 ['the bell tower',[
  '################################',
  '#@.......#.........#..........$#',
  '#........#....G....#....D......#',
  '#..f.....#.........#...........#',
  '#........##########=######.....#',
  '#..k...........................#',
  '####=##.......#####.......##=###',
  '#.....#.......#.X.#.......#....#',
  '#..p..#.......#...#.......#..k.#',
  '#.....#...l...##=##...l...#....#',
  '#.....#...................#....#',
  '#.$...=.........$.........=..f.#',
  '#.....#...................#....#',
  '#.....#...r.....p.....r...#....#',
  '#.....#...................#....#',
  '###=####=###.......###=######=##',
  '#..........#.......#...........#',
  '#...g......#...f...#.....S.....#',
  '#..........#.......#...........#',
  '#..k...$...=.......=....$...E..#',
  '#.f........#.$...$.#..........$#',
  '################################']]]);
const C=CONFIG,T=CONFIG.tile,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),GEN={g:'ghost',r:'grunt',d:'demon',l:'lobber',s:'sorcerer'};
const DIRS=Object.freeze([[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]);
class GauntletEngine{
 constructor(seed=1985){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.arng=new SeededRandom(seed*7+11);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.health=C.health;this.keys=0;this.potions=0;this.deaths=0;this.shots=0;this.nextId=0;
  this.said={};this.drain=0;this.magicHeld=false;this.state='play';this.timer=0;this.hero=C.heroes[0];this.picked=false;this.shot=null;
  // Always four players, like a full cabinet (owner 2026-10-30): the three heroes the player did not pick play alongside.
  this.allies=C.heroes.slice(1).map((hero,k)=>({id:k,hero,health:C.health,x:0,y:0,face:2,moving:false,melee:0,shot:null,away:0,down:false,goal:null,goalT:0,react:0}));this.load(1);return this}
 // The player select: the hero is set by the first step's input (1 to 4), so a recorded run replays the same hero.
 setHero(i){this.hero=C.heroes[i]||C.heroes[0];const rest=C.heroes.filter(h=>h!==this.hero);this.allies.forEach((a,k)=>a.hero=rest[k])}
 between([a,b]){return a+(b-a)*this.rng.next()}
 // Level n: map (n-1) mod the level count; every pass after the first makes the generators one level stronger.
 load(n){this.level=n;const i=(n-1)%LEVELS.length,lap=Math.floor((n-1)/LEVELS.length),[name,rows]=LEVELS[i];this.name=name;
  this.map=rows.map(r=>r.split(''));this.rows=rows.length;this.cols=rows[0].length;this.monsters=[];this.gens=[];this.shot=null;this.missiles=[];this.exiting=null;
  this.map.forEach((row,r)=>row.forEach((ch,c)=>{const k=GEN[ch.toLowerCase()];
   if(k){const level=ch===ch.toUpperCase()?3:Math.min(3,C.genBase[i]+lap);this.gens.push({c,r,kind:k,level,timer:this.between(C.spawnEvery)});row[c]='G'}
   else if(ch==='X'){this.monsters.push(this.monster('death',c,r,3));row[c]='.'}
   else if(ch==='@'){this.player={x:(c+.5)*T,y:(r+.5)*T,face:2,moving:false,melee:0};row[c]='.'}}));
  // Like the cabinet's mazes, each level starts crowded: every generator's monsters already stand round it.
  for(const gen of this.gens)for(const [c,r] of this.near({x:(gen.c+.5)*T,y:(gen.r+.5)*T},C.crowd+Math.min(3,Math.floor((n-1)/4))))if(Math.hypot((c+.5)*T-this.player.x,(r+.5)*T-this.player.y)>4*T)this.monsters.push(this.monster(gen.kind,c,r,gen.level));
  // The classmates start on the free squares nearest the start; one who flunked out comes back with a coin's worth of health.
  const spots=this.near(this.player,3);this.allies.forEach((a,k)=>{const [c,r]=spots[k]||this.at(this.player.x,this.player.y);Object.assign(a,{x:(c+.5)*T,y:(r+.5)*T,face:2,moving:false,melee:0,shot:null,away:0,goal:null,goalT:0,react:0});
   if(a.down){a.down=false;a.health=C.allyBack;this.say(a.hero.who+' is back with a late pass.')}});
  this.events.push({type:'level',level:n,name});this.say(name+'.')}
 say(text,once){if(once){if(this.said[once])return;this.said[once]=true}this.events.push({type:'say',text})}
 tile(c,r){return r>=0&&r<this.rows&&c>=0&&c<this.cols?this.map[r][c]:'#'}
 solid(ch){return ch==='#'||ch==='='||ch==='G'}
 at(x,y){return[Math.floor(x/T),Math.floor(y/T)]}
 // The n free floor squares nearest a body (breadth first, its own square left out).
 near(b,n){const [c0,r0]=this.at(b.x,b.y),seen=new Set([c0+','+r0]),q=[[c0,r0]],out=[];
  for(let h=0;h<q.length&&out.length<n;h++){const [c,r]=q[h];if(h&&this.tile(c,r)==='.'&&!this.monsters.some(m=>Math.hypot(m.x-(c+.5)*T,m.y-(r+.5)*T)<T))out.push([c,r]);
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const k=(c+dx)+','+(r+dy);if(seen.has(k)||this.solid(this.tile(c+dx,r+dy)))continue;seen.add(k);q.push([c+dx,r+dy])}}return out}
 // Everyone in play: the player (owner this engine) and the classmates still standing (each its own owner).
 bodies(){const out=[{b:this.player,who:this}];for(const a of this.allies)if(!a.down)out.push({b:a,who:a});return out}
 nearest(m){let best=null;for(const o of this.bodies()){const d=Math.hypot(o.b.x-m.x,o.b.y-m.y);if(!best||d<best.d)best={...o,d}}return best}
 // Any wall, gate or generator under the square of half-width R around (x, y).
 hitsWall(x,y,R){for(const [px,py] of [[x-R,y-R],[x+R,y-R],[x-R,y+R],[x+R,y+R]]){const [c,r]=this.at(px,py);if(this.solid(this.tile(c,r)))return [c,r]}return null}
 monster(kind,c,r,level){return{id:this.nextId++,kind,x:(c+.5)*T,y:(r+.5)*T,level,start:level,cd:0,fire:this.between(C.fireEvery),seen:true,fade:this.between(C.sorcererSeen),drained:0,dir:1}}
 view(){const p=this.player;return{x:clamp(p.x-C.viewW/2,0,Math.max(0,this.cols*T-C.viewW)),y:clamp(p.y-C.viewH/2,0,Math.max(0,this.rows*T-C.viewH)),w:C.viewW,h:C.viewH}}
 onScreen(o,m=0){const v=this.view();return o.x>v.x-m&&o.x<v.x+v.w+m&&o.y>v.y-m&&o.y<v.y+v.h+m}
 pace(){return 1+C.ramp*Math.min(this.level-1,C.rampMax)}
 award(n,by=this){if(by===this)this.score+=n}
 // Monster hits on anyone: armor takes its share (never off Death); a classmate at 0 health flunks out until the next level.
 hurt(n,kind,who=this){if(this.state!=='play'||n<=0)return;if(kind!=='death')n=Math.max(1,Math.round(n*(1-who.hero.armor)));
  if(who!==this){if(who.down)return;who.health=Math.max(0,who.health-n);if(who.health<=0)this.flunk(who);return}
  const before=this.health;this.health=Math.max(0,this.health-n);this.events.push({type:'hurt',amount:n,kind});this.checkHealth(before)}
 flunk(a){a.down=true;a.shot=null;this.events.push({type:'allyDown',x:a.x,y:a.y,hero:a.hero.id});this.say(a.hero.who+' flunked out.')}
 checkHealth(before){const h=this.health;
  if(h<C.lowHealth&&before>=C.lowHealth)this.say(this.hero.who+' needs lunch, badly.');
  if(h<C.dyingHealth&&before>=C.dyingHealth)this.say(this.hero.who+' is about to flunk.');
  if(h<=0&&this.state==='play'){this.state='end';this.events.push({type:'gameover',score:this.score,level:this.level})}}
 step(dt,input={}){if(!this.picked){this.picked=true;const h=Math.round(Number(input.hero)||0);if(h>=1&&h<=4)this.setHero(h-1)}this.clock+=dt;if(this.state==='end')return;
  if(this.state==='exit'){this.timer-=dt;if(this.timer<=0){this.state='play';this.load(this.exiting)}return}
  // Health counts down a point every second, whatever happens, for every player.
  this.drain+=dt;while(this.drain>=C.drainEvery){this.drain-=C.drainEvery;for(const a of this.allies)if(!a.down&&--a.health<=0)this.flunk(a);const b=this.health;this.health--;this.checkHealth(b)}if(this.state!=='play')return;
  const magic=!!input.magic;if(magic&&!this.magicHeld&&this.potions>0)this.useMagic();this.magicHeld=magic;
  this.moveBody(this.player,this,dt,input);if(this.state!=='play')return;this.moveShot(dt,this);
  for(const a of this.allies){if(a.down)continue;this.keepUp(a,dt);this.moveBody(a,a,dt,this.allyPilot(a,dt));this.moveShot(dt,a)}
  this.spawn(dt);this.moveMonsters(dt);this.moveMissiles(dt)}
 // A classmate left off the page for two seconds catches up at the player's side, as the cabinet keeps everyone on one screen.
 keepUp(a,dt){if(this.onScreen(a)){a.away=0;return}a.away+=dt;if(a.away<C.allyAway)return;a.away=0;const s=this.near(this.player,6);if(!s.length)return;const [c,r]=s[a.id%s.length]||s[0];a.x=(c+.5)*T;a.y=(r+.5)*T;a.shot=null}
 // Walking, throwing and fighting for the player and the classmates alike; only the player carries keys and opens gates.
 moveBody(p,who,dt,input){const ax=clamp(Number(input.axis)||0,-1,1)||((input.right?1:0)-(input.left?1:0)),ay=clamp(Number(input.axisY)||0,-1,1)||((input.down?1:0)-(input.up?1:0));
  p.melee=Math.max(0,p.melee-dt);const steer=Math.abs(ax)>.3||Math.abs(ay)>.3;
  if(steer)p.face=this.dirIndex(ax,ay);
  // Holding fire plants the hero: he turns and throws, one ball in the air at a time.
  if(input.fire){p.moving=false;if(!who.shot){const [dx,dy]=DIRS[p.face],n=Math.hypot(dx,dy);who.shot={x:p.x,y:p.y,vx:dx/n*who.hero.shotSpeed,vy:dy/n*who.hero.shotSpeed};if(who===this)this.shots++;this.events.push({type:'shot',ally:who!==this})}return}
  p.moving=steer;if(!steer)return;const n=Math.max(1,Math.hypot(ax,ay)),vx=ax/n*who.hero.speed*dt,vy=ay/n*who.hero.speed*dt;
  // Walking into a monster fights it hand to hand instead of moving (never a ghost or Death).
  const foe=this.monsters.find(m=>m.kind!=='death'&&m.kind!=='ghost'&&Math.hypot(m.x-p.x-vx*8,m.y-p.y-vy*8)<C.playerR+C.monsterR+2&&(m.x-p.x)*vx+(m.y-p.y)*vy>0);
  if(foe){if(p.melee<=0){p.melee=C.meleeEvery;this.hitMonster(foe,true,who.hero.fight,who)}return}
  for(const [mx,my] of [[vx,0],[0,vy]]){const nx=p.x+mx,ny=p.y+my,w=this.hitsWall(nx,ny,C.playerR);
   if(!w){p.x=nx;p.y=ny;continue}
   const [c,r]=w;if(who===this&&this.tile(c,r)==='='&&this.keys>0){this.keys--;this.openDoor(c,r);continue}
   // Corner slide, as on the cabinet: a body brushing the corner of an opening is eased along the wall into line with the
   // free square ahead, so it walks through gaps without having to line up exactly (owner 2026-10-31).
   const ahead=mx?this.at(p.x+Math.sign(mx)*(C.playerR+2),p.y):this.at(p.x,p.y+Math.sign(my)*(C.playerR+2)),near=this.at(p.x,p.y),lane=mx?near[1]:near[0];
   for(const l of [lane,lane-1,lane+1]){const [tc,tr]=mx?[ahead[0],l]:[l,ahead[1]];if(this.solid(this.tile(tc,tr)))continue;const mid=(l+.5)*T,cur=mx?p.y:p.x,d=mid-cur;
    if(Math.abs(d)>T*.6)continue;const step=Math.sign(d)*Math.min(Math.abs(d),Math.abs(mx||my));const sx=mx?p.x:p.x+step,sy=mx?p.y+step:p.y;if(step&&!this.hitsWall(sx,sy,C.playerR)){p.x=sx;p.y=sy}break}}
  if(who===this)this.pickup();else this.allyPickup(p)}
 dirIndex(x,y){const a=Math.atan2(y,x);return((Math.round(a/(Math.PI/4))%8)+8)%8}
 // A key opens the whole connected gate.
 openDoor(c,r){const st=[[c,r]];let n=0;while(st.length){const [x,y]=st.pop();if(this.tile(x,y)!=='=')continue;this.map[y][x]='.';n++;st.push([x+1,y],[x-1,y],[x,y+1],[x,y-1])}
  this.events.push({type:'door',tiles:n,x:(c+.5)*T,y:(r+.5)*T})}
 pickup(){const p=this.player,[c,r]=this.at(p.x,p.y);
  for(let y=r-1;y<=r+1;y++)for(let x=c-1;x<=c+1;x++){const ch=this.tile(x,y);if(!'kfp$E23456789'.includes(ch)||Math.hypot((x+.5)*T-p.x,(y+.5)*T-p.y)>T*.6)continue;
   if(ch==='E'||ch>='2'&&ch<='9'){const lap=Math.floor((this.level-1)/LEVELS.length),to=ch==='E'?this.level+1:lap*LEVELS.length+Number(ch);
    if(ch!=='E')this.say('a shortcut to level '+to+'.');this.exiting=to;this.state='exit';this.timer=C.exitPause;this.events.push({type:'exit',from:this.level,to,skip:to>this.level+1});return}
   this.map[y][x]='.';const ev={type:'pickup',x:(x+.5)*T,y:(y+.5)*T};
   if(ch==='f'){this.health+=C.food;ev.item='food'}
   else if(ch==='k'){this.keys++;this.award(C.points.key);ev.item='key';ev.points=C.points.key;this.say('use keys to open the gates.','key')}
   else if(ch==='p'){this.potions++;this.award(C.points.potion);ev.item='potion';ev.points=C.points.potion;this.say('ring the bell to clear the hall.','potion')}
   else{this.award(C.points.treasure);ev.item='treasure';ev.points=C.points.treasure}
   this.events.push(ev)}}
 // Classmates leave the keys, money and bells to the player and only eat a lunch they need.
 allyPickup(a){if(a.health>=a.hero.ally.food)return;const [c,r]=this.at(a.x,a.y);
  for(let y=r-1;y<=r+1;y++)for(let x=c-1;x<=c+1;x++)if(this.tile(x,y)==='f'&&Math.hypot((x+.5)*T-a.x,(y+.5)*T-a.y)<=T*.6){this.map[y][x]='.';a.health+=C.food;this.events.push({type:'pickup',item:'food',ally:true,x:(x+.5)*T,y:(y+.5)*T});return}}
 pointsFor(m,melee,magic){return magic?C.points.magic:melee?C.points.melee:C.points.shot[m.kind]||0}
 // Each hit takes a level off; the last one kills. Only the player's kills score.
 hitMonster(m,melee,power=1,by=this){m.level-=power;this.events.push({type:'hit',kind:m.kind,x:m.x,y:m.y,melee,ally:by!==this});if(m.level>0)return;this.kill(m,melee,false,by)}
 kill(m,melee,magic,by=this){this.monsters=this.monsters.filter(o=>o!==m);let pts;
  if(m.kind==='death'){pts=C.deathPoints[this.deaths%C.deathPoints.length];this.deaths++}else pts=this.pointsFor(m,melee,magic);
  if(by!==this)pts=0;this.award(pts);this.events.push({type:'kill',kind:m.kind,points:pts,x:m.x,y:m.y,melee:!!melee,magic:!!magic,ally:by!==this})}
 // Magic: every monster on screen is gone, Death included.
 useMagic(){this.potions--;const seen=this.monsters.filter(m=>this.onScreen(m)),hit=[];for(const m of seen){if(m.kind!=='death')m.level-=this.hero.magic;if(m.kind==='death'||m.level<=0){this.kill(m,false,true);hit.push(m)}}this.events.push({type:'magic',count:hit.length});if(hit.some(m=>m.kind==='death'))this.say('the principal has left the building.')}
 blast(x,y,by=this){const hit=this.monsters.filter(m=>m.kind!=='death'&&Math.hypot(m.x-x,m.y-y)<C.blast*T);for(const m of hit)this.kill(m,false,true,by);this.events.push({type:'magic',count:hit.length,shot:true,x,y})}
 // One thrown ball per player, flying until it hits something or leaves the page.
 moveShot(dt,who=this){const s=who.shot;if(!s)return;const done=()=>{who.shot=null};for(let k=0;k<3&&who.shot;k++){s.x+=s.vx*dt/3;s.y+=s.vy*dt/3;
   const [c,r]=this.at(s.x,s.y),ch=this.tile(c,r);
   if(ch==='G'){const gen=this.gens.find(o=>o.c===c&&o.r===r),pts=who===this?C.points.generator:0;this.award(pts,who);gen.level-=who.hero.shot;this.events.push({type:'generator',x:(c+.5)*T,y:(r+.5)*T,level:gen.level,points:pts});
    if(gen.level<=0){this.gens=this.gens.filter(o=>o!==gen);this.map[r][c]='.'}done();return}
   if(ch==='#'||ch==='='){done();return}
   if(ch==='f'&&Math.hypot((c+.5)*T-s.x,(r+.5)*T-s.y)<T*.4){this.map[r][c]='.';done();this.events.push({type:'shotFood',x:(c+.5)*T,y:(r+.5)*T});this.say(who.hero.who+' shot the lunch.');return}
   if(ch==='p'&&Math.hypot((c+.5)*T-s.x,(r+.5)*T-s.y)<T*.4){this.map[r][c]='.';done();this.blast((c+.5)*T,(r+.5)*T,who);return}
   const m=this.monsters.find(o=>Math.hypot(o.x-s.x,o.y-s.y)<C.monsterR+C.shotR&&!(o.kind==='sorcerer'&&!o.seen));
   // A hit on Death scores 1 and moves his point cycle on.
   if(m){done();if(m.kind!=='death')this.hitMonster(m,false,who.hero.shot,who);else if(who===this){this.award(C.points.deathHit);this.deaths++;this.events.push({type:'absorb',x:m.x,y:m.y,points:C.points.deathHit})}return}}
  if(!this.onScreen(s,T))done()}
 // Generators spawn their own kind and level into a free neighbouring square while the player is near.
 spawn(dt){const p=this.player,all=this.bodies();for(const gen of this.gens){gen.timer-=dt;if(gen.timer>0)continue;gen.timer=this.between(C.spawnEvery)/this.pace();
   const gx=(gen.c+.5)*T,gy=(gen.r+.5)*T;if(Math.hypot(gx-p.x,gy-p.y)>C.spawnRange*T||this.monsters.length>=C.maxMonsters)continue;
   const free=DIRS.map(([dx,dy])=>[gen.c+dx,gen.r+dy]).filter(([c,r])=>!this.solid(this.tile(c,r))&&!this.monsters.some(m=>Math.hypot(m.x-(c+.5)*T,m.y-(r+.5)*T)<C.monsterR*2)&&all.every(o=>Math.hypot((c+.5)*T-o.b.x,(r+.5)*T-o.b.y)>C.playerR+C.monsterR+4));
   if(!free.length)continue;const [c,r]=free[Math.floor(this.rng.next()*free.length)];this.monsters.push(this.monster(gen.kind,c,r,gen.level));this.events.push({type:'spawn',kind:gen.kind})}}
 free(m,x,y){if(this.hitsWall(x,y,C.monsterR-2))return false;for(const {b} of this.bodies())if(Math.hypot(b.x-x,b.y-y)<C.playerR+C.monsterR)return false;
  for(const o of this.monsters)if(o!==m&&Math.hypot(o.x-x,o.y-y)<C.monsterR*1.6&&Math.hypot(o.x-x,o.y-y)<Math.hypot(o.x-m.x,o.y-m.y))return false;return true}
 los(x0,y0,x1,y1,fine){const n=Math.ceil(Math.hypot(x1-x0,y1-y0)/(fine?T/12:T/3));for(let i=1;i<n;i++){const [c,r]=this.at(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n);if(this.solid(this.tile(c,r)))return false}return true}
 // Every monster goes for the nearest player, like the cabinet's: straight at him, and when a locker is in the way the
 // next of the eight directions round on the side nearer his line, up to a right angle and back, then the other side;
 // lobbers keep their distance.
 moveMonsters(dt){const p=this.player;
  for(const m of [...this.monsters]){if(!this.monsters.includes(m))continue;if(Math.hypot(p.x-m.x,p.y-m.y)>C.activeRange*T)continue;const t=this.nearest(m),{b,who}=t,dx=b.x-m.x,dy=b.y-m.y,d=t.d;
   m.cd=Math.max(0,m.cd-dt);
   if(m.kind==='sorcerer'){m.fade-=dt;if(m.fade<=0){m.seen=!m.seen;m.fade=this.between(m.seen?C.sorcererSeen:C.sorcererHidden)}}
   let sx=dx/(d||1),sy=dy/(d||1);if(m.kind==='lobber'){if(d<C.lobNear*T){sx=-sx;sy=-sy}else if(d<C.lobFar*T)sx=sy=0}
   const v=C.speed[m.kind]*this.pace()*dt;if(sx||sy){if(sx)m.dir=Math.sign(sx);const i=this.dirIndex(sx,sy),off=Math.atan2(sy,sx)-Math.atan2(DIRS[i][1],DIRS[i][0]),s=m.side||(Math.sin(off)>=0?1:-1);
    // Once it has turned off its line it keeps turning the same way until the line is clear, so it never dithers.
    [[sx,sy],DIRS[(i+s+8)%8],DIRS[(i+2*s+8)%8],DIRS[(i+3*s+8)%8],DIRS[(i-s+8)%8],DIRS[(i-2*s+8)%8]].some((u,k)=>{const n=Math.hypot(u[0],u[1]),nx=m.x+u[0]/n*v,ny=m.y+u[1]/n*v;if(!this.free(m,nx,ny))return false;m.x=nx;m.y=ny;m.side=k?(k>3?-s:s):0;return true})}
   const touch=d<C.playerR+C.monsterR+4;
   if(touch){if(m.kind==='ghost'){this.monsters=this.monsters.filter(o=>o!==m);this.events.push({type:'ghostHit',x:m.x,y:m.y});this.hurt(C.damage.ghost[m.start-1],'ghost',who);continue}
    if(m.kind==='death'){const n=Math.min(C.deathDrain*dt,C.deathMax-m.drained);m.drained+=n;m.acc=(m.acc||0)+n;if(m.acc>=1){const k=Math.floor(m.acc);m.acc-=k;this.hurt(k,'death',who)}
     if(m.drained>=C.deathMax){this.monsters=this.monsters.filter(o=>o!==m);this.events.push({type:'deathLeft',x:m.x,y:m.y})}continue}
    if(m.cd<=0){m.cd=C.hitEvery;this.hurt(C.damage[m.kind][m.level-1],m.kind,who)}}
   if(m.kind==='death'&&Math.hypot(p.x-m.x,p.y-m.y)<6*T)this.say('the principal wants a word.','death');
   // Demons throw dodgeballs in a straight line; lobbers lob paper over the lockers at where their target stands.
   // A lobber within lobNear squares stops lobbing and runs (StrategyWiki).
   if(m.kind==='demon'||m.kind==='lobber'){m.fire-=dt;if(m.fire<=0&&!touch&&d<9*T&&!(m.kind==='lobber'&&d<C.lobNear*T)){
    if(m.kind==='demon'){m.fire=this.between(C.fireEvery);if(this.los(m.x,m.y,b.x,b.y)){this.missiles.push({kind:'fireball',x:m.x,y:m.y,vx:dx/d*C.fireballSpeed,vy:dy/d*C.fireballSpeed,level:m.level});this.events.push({type:'throw',kind:'fireball'})}}
    else{m.fire=this.between(C.lobEvery);this.missiles.push({kind:'rock',x0:m.x,y0:m.y,tx:b.x,ty:b.y,t:0,x:m.x,y:m.y,level:m.level});this.events.push({type:'throw',kind:'rock'})}}}}}
 moveMissiles(dt){const all=this.bodies();
  for(const o of [...this.missiles]){let gone=false;
   if(o.kind==='fireball'){o.x+=o.vx*dt;o.y+=o.vy*dt;const [c,r]=this.at(o.x,o.y);if(this.solid(this.tile(c,r)))gone=true;else{const h=all.find(q=>Math.hypot(o.x-q.b.x,o.y-q.b.y)<C.playerR+8);if(h){gone=true;this.hurt(C.damage.fireball[o.level-1],'fireball',h.who)}}}
   else{o.t+=dt/C.lobTime;const k=Math.min(1,o.t);o.x=o.x0+(o.tx-o.x0)*k;o.y=o.y0+(o.ty-o.y0)*k;o.h=Math.sin(Math.PI*k)*90;if(o.t>=1){gone=true;for(const q of all)if(Math.hypot(o.tx-q.b.x,o.ty-q.b.y)<C.lobHit)this.hurt(C.damage.rock[o.level-1],'rock',q.who)}}
   if(gone)this.missiles=this.missiles.filter(x=>x!==o)}}
 // The nearest monster or generator lined up with one of a body's eight directions within range, with a clear line.
 aim(p,range,careful){const targets=[...this.monsters.filter(m=>m.kind!=='death'&&!(m.kind==='sorcerer'&&!m.seen)),...this.gens.map(g=>({x:(g.c+.5)*T,y:(g.r+.5)*T,gen:true}))];
  let best=null;for(const t of targets){const dx=t.x-p.x,dy=t.y-p.y,d=Math.hypot(dx,dy);if(d>range*T)continue;const i=this.dirIndex(dx,dy),[ux,uy]=DIRS[i],n=Math.hypot(ux,uy),off=Math.abs(dx*uy/n-dy*ux/n);
   // The ball flies along the stick's line, so that line (not the line to the target) must be clear of lockers.
   const reach=Math.max(0,d-(t.gen?T*.6:0)),ex=p.x+ux/n*reach,ey=p.y+uy/n*reach;
   if(off<C.monsterR*.8&&this.los(p.x,p.y,ex,ey,true)&&!(careful&&this.spoils(p.x,p.y,ex,ey))&&(!best||d<best.d))best={d,i}}return best}
 // Whether a lunch or a bell lies on the line (classmates never throw through one).
 spoils(x0,y0,x1,y1){const n=Math.ceil(Math.hypot(x1-x0,y1-y0)/(T/4));for(let i=1;i<n;i++){const [c,r]=this.at(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n),ch=this.tile(c,r);if(ch==='f'||ch==='p')return true}return false}
 // Walk input towards the middle of the next square on a path.
 toward(p,next){const [c,r]=next,dx=(c+.5)*T-p.x,dy=(r+.5)*T-p.y;return{axis:Math.abs(dx)<3?0:clamp(dx/12,-1,1),axisY:Math.abs(dy)<3?0:clamp(dy/12,-1,1)}}
 // Demo pilot: throws at anything lined up in one of the eight directions, rings the bell for the principal or a crowd,
 // and otherwise walks the shortest path to the nearest pickup, the exit, or else the nearest generator.
 pilot(){const p=this.player;
  const crowd=this.monsters.filter(m=>this.onScreen(m)).length;
  if(this.potions>0&&(this.monsters.some(m=>m.kind==='death'&&Math.hypot(m.x-p.x,m.y-p.y)<4*T)||crowd>14&&this.health<800))return{magic:!this.magicHeld};
  const best=this.aim(p,7);if(best&&(!this.shot||best.d<3*T)){const [ux,uy]=DIRS[best.i];return{axis:ux,axisY:uy,fire:true}}
  const path=this.route();return path?this.toward(p,path):{}}
 // A classmate plays like another player sharing the cabinet's screen, each in their own way: the jock (brawler) charges
 // into fights and goes for the generators, the captain (guard) holds the ground round the player, the science kid
 // (explorer) works the far side of the screen and keeps his distance, the runner (scout) works toward the exit and
 // grabs lunches early. Each picks a goal on the screen and keeps it for a few seconds, takes a moment to react before
 // throwing, steps away from the principal and goes for a lunch when hurt.
 allyPilot(a,dt=0){const p=this.player,st=a.hero.ally,death=this.monsters.find(m=>m.kind==='death'&&Math.hypot(m.x-a.x,m.y-a.y)<3*T);
  if(death)return{axis:Math.sign(a.x-death.x),axisY:Math.sign(a.y-death.y)};
  if(st.style==='brawler'){const m=this.monsters.find(m=>m.kind!=='death'&&m.kind!=='ghost'&&!(m.kind==='sorcerer'&&!m.seen)&&Math.hypot(m.x-a.x,m.y-a.y)<2.5*T&&this.los(a.x,a.y,m.x,m.y));
   if(m)return{axis:clamp((m.x-a.x)/12,-1,1),axisY:clamp((m.y-a.y)/12,-1,1)}}
  const best=this.aim(a,st.range,true);if(best){a.react+=dt;if(a.react>=st.react&&(!a.shot||best.d<3*T)){const [ux,uy]=DIRS[best.i];return{axis:ux,axisY:uy,fire:true}}}else a.react=0;
  if(a.health<st.food){const next=this.search((ch,c,r,h)=>ch==='f'&&h<30&&this.inView(c,r,0),false,a);if(next)return this.toward(a,next)}
  if(!this.onScreen(a)){const [hc,hr]=this.at(p.x,p.y),next=this.search((ch,c,r)=>c===hc&&r===hr,false,a);if(next)return this.toward(a,next)}
  a.goalT-=dt;const [ac,ar]=this.at(a.x,a.y);
  if(!a.goal||a.goalT<=0||ac===a.goal[0]&&ar===a.goal[1]||!this.inView(a.goal[0],a.goal[1],1)){a.goal=this.allyGoal(a);a.goalT=3+this.arng.next()*4}
  const next=a.goal&&this.search((ch,c,r)=>c===a.goal[0]&&r===a.goal[1],false,a);if(next)return this.toward(a,next);a.goal=null;
  const mate=this.allies.find(o=>o!==a&&!o.down&&Math.hypot(o.x-a.x,o.y-a.y)<T*.8);return mate?{axis:Math.sign(a.x-mate.x)||1,axisY:Math.sign(a.y-mate.y)}:{}}
 // Squares to the nearest exit by the open halls, for the runner (refreshed when the level or its gates change).
 exitDist(c,r){const key=this.level+':'+this.map.reduce((n,row)=>n+row.filter(t=>t==='=').length,0);if(this.exitKey!==key){this.exitKey=key;const W=this.cols,d=new Int32Array(W*this.rows).fill(-1),q=[];
   for(let y=0;y<this.rows;y++)for(let x=0;x<W;x++){const t=this.tile(x,y);if(t==='E'||t>='2'&&t<='9'){d[y*W+x]=0;q.push(y*W+x)}}
   for(let h=0;h<q.length;h++){const i=q[h],x=i%W,y=(i-x)/W;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,j=ny*W+nx;if(nx<0||ny<0||nx>=W||ny>=this.rows||d[j]>=0||this.solid(this.tile(nx,ny)))continue;d[j]=d[i]+1;q.push(j)}}this.exitMap=d}
  const v=this.exitMap[r*this.cols+c];return v<0?99:v}
 // Whether a square lies on the screen at least m squares in from its edges.
 inView(c,r,m=1){const v=this.view(),x=(c+.5)*T,y=(r+.5)*T;return x>v.x+m*T&&x<v.x+v.w-m*T&&y>v.y+m*T&&y<v.y+v.h-m*T}
 // A classmate's next goal: a reachable square on the screen that suits how they play.
 allyGoal(a){const p=this.player,st=a.hero.ally.style,spots=this.near(a,140).filter(([c,r])=>this.inView(c,r,1));if(!spots.length)return null;
  const mates=this.allies.filter(o=>o!==a&&!o.down),score=([c,r])=>{const x=(c+.5)*T,y=(r+.5)*T,dp=Math.hypot(x-p.x,y-p.y)/T,crowd=this.monsters.filter(m=>Math.hypot(m.x-x,m.y-y)<3*T).length,
    apart=Math.min(9,...mates.map(o=>Math.hypot(o.x-x,o.y-y)/T)),gen=this.gens.some(g=>Math.abs(g.c-c)<=1&&Math.abs(g.r-r)<=1);
   return st==='brawler'?(gen?8:0)+crowd*1.5-dp*.2:st==='guard'?-Math.abs(dp-2.5)*2+apart*.3:st==='explorer'?Math.min(dp,8)-crowd*1.5+apart*.5:-this.exitDist(c,r)*.4+apart*.3};
  let best=null,bs=-Infinity;for(let k=0;k<24;k++){const s=spots[Math.floor(this.arng.next()*spots.length)],v=score(s)+this.arng.next()*2;if(v>bs){bs=v;best=s}}return best}
 // Breadth-first search over the tiles from a body's square to the first square that passes the test; gates count
 // as open only when asked and a key is in hand. Returns the next square on the way.
 search(test,doors,p=this.player){const [c0,r0]=this.at(p.x,p.y),W=this.cols,start=r0*W+c0,prev=new Int32Array(W*this.rows).fill(-1),q=[start];prev[start]=start;
  for(let h=0;h<q.length;h++){const i=q[h],c=i%W,r=(i-c)/W;if(h&&test(this.map[r][c],c,r,h)){let k=i;while(prev[k]!==start)k=prev[k];return[k%W,Math.floor(k/W)]}
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nc=c+dx,nr=r+dy,j=nr*W+nc,t=this.tile(nc,nr);if(prev[j]>=0||t==='#'||t==='G'||t==='='&&!(doors&&this.keys))continue;prev[j]=i;q.push(j)}}
  return null}
 // Keys first, then nearby pickups, then the exit; gates are spent only when nothing else is left.
 route(){const exit=ch=>ch==='E'||ch>='2'&&ch<='9',item=(ch,c,r,h)=>(ch==='$'||ch==='p'||ch==='f'&&(this.health<1500||h<4))&&h<16,
   gen=(ch,c,r)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>this.tile(c+dx,r+dy)==='G');
  return this.search(ch=>ch==='k',false)||this.search(item,false)||this.search(exit,false)||this.search(exit,true)||this.search(ch=>ch==='k'||ch==='$'||ch==='p'||ch==='f',true)||this.search(gen,false)}
 snapshot(){return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,health:this.health,level:this.level,keys:this.keys,potions:this.potions,shots:this.shots,player:{x:+this.player.x.toFixed(2),y:+this.player.y.toFixed(2)},
  allies:this.allies.map(a=>a.down?'out':a.health+'@'+a.x.toFixed(1)+','+a.y.toFixed(1)).join(' '),
  monsters:this.monsters.map(m=>m.kind.slice(0,2)+m.level).join(''),generators:this.gens.map(o=>o.kind.slice(0,2)+o.level).join(''),missiles:this.missiles.length}}
}
const GauntletCore={CONFIG,GauntletEngine,SeededRandom,LEVELS,DIRS};
g.GauntletCore=GauntletCore;if(typeof module!=='undefined')module.exports=GauntletCore;
})(globalThis);
