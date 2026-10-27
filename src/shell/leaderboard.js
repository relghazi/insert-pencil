'use strict';
// Online leaderboard (owner 2026-10-26, all 24 notebooks): the game's one network connection, only to its
// own leaderboard. The address is set at build time (src/shell/leaderboard-config.json or NO2_LEADERBOARD_URL, see
// server/README.md); empty means the feature is hidden and nothing is ever sent. With an address, scores are shared unless
// the player turns off "share my scores online" in settings. A real game records its seed and every fixed step's input;
// the server stores the run as pending and an hourly verifier replays it on the same core; only the score it computes
// counts. Scores wait in the save until a high scores page is shown, then go out; that page also shows the online top
// ten beside her own, with her own runs still waiting for the verifier marked "checking".
(function(g){
const BY_YEAR=['gym-class-pong','detention-breakout','space-substitutes','erasteroids','lunch-lander','galgebra','spitball-command','snack-man','recess-zone','scribble-defender','centigrade','froggology','quiz','testpest','dunce-kong','home-ec-scramble','dig-doug','q-nerd','jock-joust','class-of-2084','hall-patrol','mystery-meat-time','term-paperboy','locker-gauntlet'];
const RAW='@@leaderboard-url@@',URL_=/^https?:\/\/[^\s'"<>]+$/.test(RAW)?RAW.replace(/\/+$/,''):'';
// Every notebook. Each core declares how one fixed step's input is recorded, CONFIG.record: a list of [field, kind, ...]
// read the same way by server/src/replay.js. Every notebook records with the same three hooks in its game.js.
const GAMES=['scribble-defender','galgebra','erasteroids','gym-class-pong','detention-breakout','space-substitutes','lunch-lander','spitball-command','snack-man','recess-zone','centigrade','froggology','home-ec-scramble','testpest','quiz','dunce-kong','q-nerd','dig-doug','class-of-2084','jock-joust','mystery-meat-time','hall-patrol','term-paperboy','locker-gauntlet'],KEY='No2Arcade:leaderboard';
const TIMEOUT=4000,MAX_RUNS=50000,MAX_STEPS=432000;

// Field kinds, one cell each unless noted: b on/off; n number clamped to [lo,hi] and rounded to 1/d (d 0 keeps it
// exact); e one of a list of values, stored as its index; p an optional point {x,y} in [lo,hi] rounded to 1/d, three
// cells (present, x, y). The engine only ever sees the rebuilt input, so the recording is exactly what was played.
const num=(v,lo,hi,d)=>{v=Math.max(lo,Math.min(hi,Number(v)||0));return(d?Math.round(v*d)/d:v)||0};
const Layout={
 width(L){return 1+L.reduce((s,f)=>s+(f[1]==='p'?3:1),0)},
 encode(L,input){const c=[];for(const[k,t,a,b,d]of L){const v=input?.[k];if(t==='b')c.push(v?1:0);else if(t==='n')c.push(num(v,a,b,d));else if(t==='e'){const i=a.indexOf(v??null);c.push(i<0?0:i)}else if(t==='p'){const ok=v&&Number.isFinite(Number(v.x))&&Number.isFinite(Number(v.y));c.push(ok?1:0,ok?num(v.x,a,b,d):0,ok?num(v.y,a,b,d):0)}}return c},
 decode(L,c,i=0){const o={};for(const[k,t,a]of L){if(t==='b')o[k]=c[i++]===1;else if(t==='n')o[k]=c[i++];else if(t==='e')o[k]=a[c[i++]];else if(t==='p'){if(c[i]===1)o[k]={x:c[i+1],y:c[i+2]};i+=3}}return o}
};

// One game's inputs, one entry per fixed step, run-length encoded as [steps, cell, cell, ..., steps, ...].
class Recorder{
 constructor(game,seed,core){const C=core?.CONFIG;this.game=game;this.seed=seed;this.layout=C?.record||[];this.version=String(C?.version||'');this.w=Layout.width(this.layout);this.runs=[];this.steps=0;this.bad=!(Number.isInteger(seed)&&seed>=0&&seed<=0xffffffff)||!this.layout.length}
 take(input,live,engine){const c=Layout.encode(this.layout,input),w=this.w;
  if(engine.state!=='end'&&!this.bad){if(!live)this.bad=true;else{const r=this.runs,n=r.length;let same=n>0;for(let j=0;same&&j<w-1;j++)same=r[n-w+1+j]===c[j];if(same)r[n-w]++;else r.push(1,...c);if(r.length>MAX_RUNS*w||++this.steps>MAX_STEPS)this.bad=true}}
  return Layout.decode(this.layout,c)}
 data(){return{seed:this.seed,inputs:this.runs.slice()}}
}

const hex=n=>{const b=new Uint8Array(n);g.crypto.getRandomValues(b);return [...b].map(x=>x.toString(16).padStart(2,'0')).join('')};
const LB={
 url:URL_,enabled:!!URL_,games:GAMES,Recorder,Layout,
 origin(){return URL_?new URL(URL_).origin:''},
 supports(id){return this.enabled&&GAMES.includes(id)},
 // On by default (owner 2026-10-27); turning it off in settings stops everything, and a build without an address never sends.
 optedIn(save){return this.enabled&&save?.settings?.shareScores!==false},
 // Recording runs only in a build with a leaderboard address, so the default build plays exactly as before.
 recorder(id,seed,core){return this.supports(id)?new Recorder(id,seed,core):null},
 state(save){const s=save.storage.read(KEY,{}),st={playerId:/^[a-f0-9]{32}$/.test(s.playerId||'')?s.playerId:hex(16),pending:Array.isArray(s.pending)?s.pending:[],best:s.best&&typeof s.best==='object'?s.best:{},board:s.board&&typeof s.board==='object'?s.board:{},initials:/^[A-Z]{3}$/.test(s.initials||'')?s.initials:''};if(st.playerId!==s.playerId)save.storage.write(KEY,st);return st},
 // A finished real game: queued only while sharing is on, and only when it beats what this player already sent; one
 // waiting run per board, its best. A run on the daily challenge's seed (dailySeed, set by the shell while today's game is
 // open from the calendar) is its own board, so it is sent even when it does not beat the player's best in that game.
 finish(save,id,rec,engine,initials){if(!rec||rec.bad||!this.optedIn(save)||!this.supports(id)||engine?.state!=='end'||!rec.steps)return false;
  const st=this.state(save),name=/^[A-Z]{3}$/.test(initials||'')?initials:st.initials,score=engine.score;if(name)st.initials=name;
  const day=this.dailySeed!=null&&rec.seed===this.dailySeed,bk=day?id+'@'+rec.seed:id,isDay=v=>v>=19000101&&v<=29991231,same=p=>p.game===id&&(day?p.seed===rec.seed:!isDay(p.seed));
  if(!name||!(score>0)||score<=(st.best[bk]||0)){save.storage.write(KEY,st);return false}
  st.best[bk]=score;st.pending=[...st.pending.filter(p=>!same(p)||p.claimedScore>score),{game:id,version:rec.version,initials:name,claimedScore:score,...rec.data()}].sort((a,b)=>b.claimedScore-a.claimedScore);
  save.storage.write(KEY,st);return true},
 async request(path,options={}){const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),TIMEOUT);
  try{return await fetch(URL_+path,{...options,signal:ctl.signal,mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'text/plain'}})}finally{clearTimeout(t)}},
 // Sends what is waiting, then reads the top ten. Never throws; offline is reported, not raised.
 // seed (owner 2026-10-30, daily challenge): only that day's runs, kept as their own board.
 async sync(save,id,seed=null){if(!this.optedIn(save)||!this.supports(id))return null;const bk=seed==null?id:id+'@'+seed;const st=this.state(save);let offline=false;
  for(const p of [...st.pending]){let r;try{r=await this.request('/submit',{method:'POST',body:JSON.stringify({...p,playerId:st.playerId})})}catch{offline=true;break}
   // Accepted or refused for good: either way it leaves the queue. Busy or broken servers keep it for next time.
   // A Worker not yet redeployed for this release does not know the game or version yet: keep those for later too.
   let later=r.status>=500||r.status===429||r.status===409;if(r.status===400)try{later=(await r.clone().json())?.error==='unknown game'}catch{}
   if(!later){const cur=this.state(save);cur.pending=cur.pending.filter(q=>!(q.game===p.game&&q.claimedScore===p.claimedScore&&q.seed===p.seed));save.storage.write(KEY,cur)}}
  let rows=null;if(!offline)try{const r=await this.request('/scores?game='+encodeURIComponent(id)+'&limit=10&pending=1&player='+st.playerId+(seed==null?'':'&seed='+seed));if(r.ok){const j=await r.json();if(Array.isArray(j.scores))rows=j.scores.slice(0,10).map(x=>({initials:String(x.initials).slice(0,3),score:Math.max(0,Math.floor(Number(x.score))||0),you:!!x.you,pending:!!x.you&&!!x.pending}))}else offline=true}catch{offline=true}
  // The last board seen is kept, so an offline page still shows something real.
  const cur=this.state(save);if(rows){cur.board={...cur.board,[bk]:rows};save.storage.write(KEY,cur);return{rows,offline:false}}
  return{rows:cur.board?.[bk]||null,offline:true,stale:!!cur.board?.[bk]}},
 // Settings sheet: the switch, on by default. Turning it off forgets anything still waiting to be sent.
 settingsRow(options,action,save,refresh){if(!this.enabled)return;const on=this.optedIn(save),b=action('Share my scores online: '+(on?'On':'Off'),()=>{const st=this.state(save);if(on){st.pending=[];save.storage.write(KEY,st)}save.setSettings({shareScores:!on});refresh()});b.setAttribute('aria-pressed',String(on));options.append(b)},
 // High scores page: her list stays as it is; with sharing on, the online top ten sit beside it.
 // Score notes in the locker (owner 2026-10-27): the online boards one game at a time, previous and next through all of
 // them, like the who's who polaroids. games is [[id,title],...]; start is the id shown first.
 browser(content,save,games,start){const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
  // In the year each original came out (owner 2026-10-27), same-year games in locker order.
  const year=id=>{const i=BY_YEAR.indexOf(id);return i<0?99:i};games=games.filter(([id])=>this.supports(id)).sort((a,b)=>year(a[0])-year(b[0]));if(!games.length)return;
  if(!this.optedIn(save)){content.append(mk('p','lb-hint','online scores: turn on sharing in settings.'));return}
  const name=mk('p','lb-game'),count=mk('span','cast-count'),nav=mk('div','cast-nav lb-nav'),prev=mk('button','cast-prev','\u2190 previous'),next=mk('button','cast-next','next \u2192'),list=mk('ol','score-list lb-list'),note=mk('p','lb-note','');
  prev.type=next.type='button';nav.append(prev,count,next);const link=this.boardLink(mk,()=>games[at]?.[0]);content.append(name,list,note,nav,link);
  let at=Math.max(0,games.findIndex(([id])=>id===start)),ticket=0;
  const fill=rows=>{list.replaceChildren();for(let i=0;i<10;i++){const r=rows[i],li=mk('li',r?.you?'lb-you':'');const who=mk('span','',r?r.initials:'___');if(r?.pending){li.className+=' lb-pending';who.append(' ',mk('small','lb-check','checking'))}li.append(mk('i','',String(i+1)),who,mk('b','',r?Number(r.score).toLocaleString('en-US'):'0'));list.append(li)}};
  const show=i=>{at=(i+games.length)%games.length;const [id,title]=games[at],t=++ticket;name.textContent=title;count.textContent=(at+1)+' / '+games.length;fill([]);note.textContent='checking the board...';
   this.sync(save,id).then(res=>{if(t!==ticket||!list.isConnected||!res)return;if(res.rows)fill(res.rows);note.textContent=res.offline?(res.stale?'offline. the last board I saw.':'offline. try again later.'):!res.rows?.length?'no scores yet.':res.rows.some(r=>r.pending)?'yours are in red. checked within the hour.':res.rows.some(r=>r.you)?'yours are in red.':''}).catch(()=>{if(t===ticket&&list.isConnected)note.textContent='offline. try again later.'})};
  prev.onclick=()=>show(at-1);next.onclick=()=>show(at+1);nav.onkeydown=e=>{if(e.key==='ArrowLeft'){show(at-1);e.preventDefault()}else if(e.key==='ArrowRight'){show(at+1);e.preventDefault()}};
  show(at);return next},
 // Detention slip from the locker (owner 2026-10-27): sent only when the player presses send, to the same Worker, with
 // what they wrote, the game version and a short device line; no player id. Resolves to 'sent', 'busy' or 'failed'.
 async report(about,text,device){if(!this.enabled)return'failed';try{const r=await fetch(URL_+'/report',{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({about,text,version:String(g.No2Catalog?.version||""),device})});return r.ok?'sent':r.status===429?'busy':'failed'}catch{return'failed'}},
 // The whole public scoreboard (owner 2026-10-30): opens no2arca.de/scores at that game in a new tab; the player's click
 // opens it, the game itself still connects only to the leaderboard Worker.
 boardLink(mk,id){const b=mk('button','lb-whole','see the whole board \u2197');b.type='button';b.onclick=()=>this.openBoard();return b},
  // The main scoreboard page with every game (owner 2026-10-30).
  openBoard(){g.open?.('https://no2arca.de/scores/','_blank','noopener')},
 scoresPage(content,id,save){if(!this.supports(id))return;const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
  if(!this.optedIn(save)){content.append(mk('p','lb-hint','online scores: turn on sharing in settings.'));return}
  const mine=content.querySelector('.score-list'),board=mk('div','lb-board'),left=mk('section','lb-col'),right=mk('section','lb-col lb-online'),list=mk('ol','score-list lb-list'),note=mk('p','lb-note','checking the board...');
  left.append(mk('p','lb-label','mine'));if(mine)left.append(mine);right.append(mk('p','lb-label','online'),list,note,this.boardLink(mk,id));board.append(left,right);content.append(board);
  const fill=rows=>{list.replaceChildren();for(let i=0;i<10;i++){const r=rows[i],li=mk('li',r?.you?'lb-you':'');const who=mk('span','',r?r.initials:'___');if(r?.pending){li.className+=' lb-pending';who.append(' ',mk('small','lb-check','checking'))}li.append(mk('i','',String(i+1)),who,mk('b','',r?Number(r.score).toLocaleString('en-US'):'0'));list.append(li)}};fill([]);
  this.sync(save,id).then(res=>{if(!board.isConnected||!res)return;if(res.rows)fill(res.rows);note.textContent=res.offline?(res.stale?'offline. the last board I saw.':'offline. yours go out later.'):(res.rows.some(r=>r.pending)?'yours are in red. checked within the hour.':res.rows.some(r=>r.you)?'yours are in red.':'')}).catch(()=>{if(board.isConnected)note.textContent='offline. yours go out later.'})}
};
if(typeof document!=='undefined'&&LB.enabled){const st=document.createElement('style');st.id='leaderboard-style';
 st.textContent='body.locker-hub #paper-content .lb-board{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:2.2em;align-items:start;max-width:100%}'+
 'body.locker-hub #paper-content .lb-col .score-list{max-width:none!important}'+
 'body.locker-hub #paper-content :is(.lb-label,.lb-note,.lb-hint){font-family:Hand,Schoolhand,sans-serif;font-size:var(--t-body);color:var(--ink);margin:0 0 .3em;line-height:1.35}'+
 'body.locker-hub #paper-content .lb-label{text-transform:lowercase;opacity:.8;border-bottom:1px solid currentColor;display:inline-block}'+
 'body.locker-hub #paper-content .lb-note{margin-top:.5em;min-height:1.35em}body.locker-hub #paper-content .lb-hint{margin-top:.8em;opacity:.8}'+
 'body.locker-hub #desk-dialog :is(.lb-game,.lb-note,.lb-hint){font-family:Hand,Schoolhand,sans-serif;font-size:var(--t-body);color:var(--ink);margin:0 0 .3em;line-height:1.35;text-align:center}body.locker-hub #desk-dialog .lb-game{border-bottom:1px solid currentColor;width:max-content;margin:0 auto .4em}body.locker-hub #desk-dialog .lb-note{min-height:1.35em;margin-top:.4em;opacity:.8}'+
 'body.locker-hub #desk-dialog .lb-list :is(i,span,b){color:var(--pen,#1f3a6b)!important}body.locker-hub #desk-dialog .lb-list li.lb-you :is(i,span,b){color:#a3312a!important}body.locker-hub #desk-dialog .lb-check{font-family:Hand,Schoolhand,sans-serif;font-size:var(--t-meta);opacity:.8;white-space:nowrap}'+
 'body.locker-hub #paper-content .lb-list :is(i,span,b){color:var(--pen,#1f3a6b)!important}body.locker-hub #paper-content .lb-list li.lb-you :is(i,span,b){color:#a3312a!important}'+
 'body.locker-hub #paper-content .lb-list .lb-check{font-family:Hand,Schoolhand,sans-serif;font-size:var(--t-meta);color:inherit;opacity:.8;white-space:nowrap}';
 (document.head||document.documentElement).append(st)}
g.No2Leaderboard=LB;if(typeof module!=='undefined')module.exports=LB;
})(globalThis);
