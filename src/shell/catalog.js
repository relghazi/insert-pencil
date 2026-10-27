
'use strict';
// Titles live in one place. The three provisional names can change without
// changing stable game IDs, save keys, covers or future simulation modules.
(function(g){
const rows=[
 ['scribble-defender','Scribble Defender','college','defender',0,'the invasion starts in the margins.'],
 ['gym-class-pong','Gym Class Pong','quiz','folder',1,'a gym. allegedly.'],
 ['detention-breakout','Detention Breakout','college','composition',2,'one wall at a time.'],
 ['space-substitutes','Space Substitutes','wide','spiral',3,'the seating chart got weird.'],
 ['erasteroids','Erasteroids','graph','graph',4,'space, but on squared paper.'],
 ['lunch-lander','Lunch Lander','graph','graph',5,'try not to spill anything.'],
 ['spitball-command','Spitball Command','college','composition',6,'protect the back row.'],
 ['snack-man','Snack-Man','college','composition',7,'a snack route, eventually.'],
 ['recess-zone','Recess Zone','graph','graph',8,'the playground is a map now.'],
 ['galgebra','Galgebra','graph','graph',9,'this counts as maths.'],
 ['centigrade','Centigrade','college','spiral',10,'too many legs.'],
 ['froggology','Froggology','lab','biology',11,'field notes: do not get squashed.'],
 ['quiz','Quiz','blank','quiz',12,'please stay inside the lines.'],
 ['testpest','Testpest','graph','graph',13,'a tunnel in the homework.'],
 ['home-ec-scramble','Home Ec Scramble','recipe','recipe',14,'the recipe has other plans.'],
 ['dunce-kong','Dunce Kong','college','composition',15,'stairs were a bad idea.'],
 ['dig-doug','Dig Doug','college','composition',16,'there is a world under this page.'],
 ['q-nerd','Q*Nerd','isometric','dots',17,'every corner has another corner.'],
 ['jock-joust','Jock Joust','college','spiral',18,'PE got competitive.'],
 ['class-of-2084','Robotron: Class of 2084','college','composition',19,'the class photo went badly.'],
 ['mystery-meat-time','Mystery Meat Time','menu','folder',20,'probably edible.'],
 ['hall-patrol','Hall Patrol','college','spiral',21,'someone has to check the halls.'],
 ['term-paperboy','Term Paperboy','college','folder',22,'special delivery.'],
 ['locker-gauntlet','Locker Gauntlet','graph','graph',23,'the lockers go deeper.']
];
const papers={college:'college ruled',quiz:'crumpled maths quiz',wide:'wide ruled',graph:'graph paper',lab:'biology lab paper',blank:'blank quiz sheet',recipe:'recipe card stock',isometric:'isometric dot grid',menu:'cafeteria menu'};
const notebooks=rows.map(([id,title,paper,family,index,note])=>Object.freeze({id,title,paper,paperName:papers[paper],family,index,note,version:id==='scribble-defender'?'0.3.2':'0.4.0',available:['scribble-defender','erasteroids','gym-class-pong','detention-breakout','space-substitutes','lunch-lander','spitball-command','snack-man','recess-zone','galgebra','centigrade','froggology','home-ec-scramble','testpest','quiz','dunce-kong','q-nerd','dig-doug','class-of-2084','jock-joust','mystery-meat-time','hall-patrol','term-paperboy','locker-gauntlet'].includes(id),provisional:['snack-man','q-nerd','dunce-kong'].includes(id),coverAsset:'cover-'+id,thumbAsset:'thumb-'+id,paperAsset:'paper-'+paper,titleAsset:null,highScoreTableId:'No2Arcade:game:'+id+':scores',unlockDay:index+1,seed:1981+index,settings:{},inputMap:id==='scribble-defender'?{up:'arrowup',down:'arrowdown',left:'arrowleft',right:'arrowright',fire:' ',thrust:'shift',reverse:'r',bomb:'b',warp:'h',pause:'p'}:{},cheatSheet:id==='scribble-defender'?['WASD / arrows: fly. Space: tap to fire.','Shift: thrust. R: reverse. B: bomb. H: warp.','Catch classmates, then put them on the hills.','Lasers hit classmates too. P pauses. Esc closes.','Controller: stick altitude. A fires.','RT / RB thrusts. X reverses. B bombs. Y warps. LB+B closes.']:['still blank.','the rules go here when this game is ready.','for now, the tabs are the only controls.']}));
const progression=['scribble-defender','erasteroids','space-substitutes','detention-breakout','spitball-command','quiz','snack-man',...notebooks.map(n=>n.id).filter(id=>!['scribble-defender','erasteroids','space-substitutes','detention-breakout','spitball-command','quiz','snack-man'].includes(id))];
const catalog={progression,unlockScore:10000,deskLimit:6,version:'0.8.5',title:'No. 2 Arcade',step:1/120,defaultDesk:notebooks.slice(0,6).map(n=>n.id),notebooks,papers,byId:Object.fromEntries(notebooks.map(n=>[n.id,n])),budgets:{htmlBytes:64*1048576,hubPixels:32*1048576,blankNotebookPixels:12*1048576,defenderAtlasPixels:128*1048576,futureSimpleAtlasPixels:32*1048576,futureDenseAtlasPixels:64*1048576}};
g.No2Catalog=catalog;if(typeof module!=='undefined')module.exports=catalog;
})(globalThis);

