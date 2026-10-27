const No2DefenderSpriteConfig={"padding":4,"effects":{"baiter-death":[4,5,6,7],"bomber-death":[4,5,6,7],"lander-death":[4,5,6,7],"mutant-death":[4,5,6,7],"player-explosion":[6,7,8,9,10,11],"pod-death":[4,5,6,7],"swarmer-death":[4,5,6,7]},"bursts":{"scribble-burst-1":{"left":6,"top":24,"right":121,"bottom":104,"w":128,"h":128},"scribble-burst-2":{"left":6,"top":22,"right":121,"bottom":105,"w":128,"h":128},"scribble-burst-3":{"left":6,"top":27,"right":121,"bottom":100,"w":128,"h":128}}};
'use strict';
(function(g){
function install(api,scope,config){
 const r=api?.renderer,P=scope?.PIXI,A=scope?.ScribbleAssets;
 if(!r?.frames||!P||!A)return {applied:false,reason:'Renderer not available'};
 if(r.no2SpritePresentation)return r.no2SpritePresentation;
 const originalFrames={},created=[],fades={},padding=config.padding;
 const rectangle=(x,y,w,h)=>new P.Rectangle(x,y,w,h);
 const texture=(base,frame,orig,trim)=>{const t=new P.Texture({source:base.source,frame,orig,trim});created.push(t);return t};
 let padded=0,repaired=0;
 for(const [id,frames]of Object.entries(r.frames)){
  const source=A.assets[id];if(!source||source.frames.length<2)continue;
  const effectFrames=config.effects[id];
  if(effectFrames){
   originalFrames[id]=frames;
   const first=effectFrames[0],last=effectFrames[effectFrames.length-1];
   r.frames[id]=frames.map((old,index)=>{
    if(!effectFrames.includes(index))return old;
    const burstId='scribble-burst-'+(index%3+1),base=originalFrames[burstId]?.[0]||r.frames[burstId][0];
    const raw=A.assets[burstId].frames[0],progress=last===first?1:(index-first)/(last-first);
    const factor=Math.min((old.orig.width-padding*2)/raw.w,(old.orig.height-padding*2)/raw.h)*(.86+.14*progress);
    const dw=raw.w*factor,dh=raw.h*factor;
    const frame=rectangle(raw.x,raw.y,raw.w,raw.h),orig=rectangle(0,0,old.orig.width,old.orig.height),trim=rectangle((orig.width-dw)/2,(orig.height-dh)/2,dw,dh);
    const t=texture(base,frame,orig,trim);t.no2FullBurst={source:burstId,padding:Math.min(trim.x,trim.y),frame:index};
    (fades[id]??={})[index]=Math.max(.12,1-index/(frames.length+1));repaired++;return t;
   });
  }else if(!/^(smart-sweep|whiteout-wipe|planet-out)$/.test(id)){
   originalFrames[id]=frames;
   r.frames[id]=frames.map((old,index)=>{
    const f=source.frames[index],atlas=A.atlases[f.atlas];
    if(f.x<padding||f.y<padding||f.x+f.w+padding>atlas.width||f.y+f.h+padding>atlas.height)throw Error('Insufficient sprite gutter: '+id);
    padded++;return texture(old,rectangle(f.x-padding,f.y-padding,f.w+padding*2,f.h+padding*2),rectangle(0,0,old.orig.width,old.orig.height),rectangle(-padding,-padding,f.w+padding*2,f.h+padding*2));
   });
  }
 }
 const originalSprite=r.sprite;
 const effectsLayer=r.page&&r.world?new P.Container():null;
 const oldInkVisibility=r.inkTags?.visible;if(r.inkTags)r.inkTags.visible=false;
 if(effectsLayer){effectsLayer.label='complete-effect-presentation';r.page.addChildAt(effectsLayer,r.page.getChildIndex(r.world)+1);effectsLayer.mask=r.paperMask;}
 r.sprite=function(command,...args){const sprite=originalSprite.call(this,command,...args),f=fades[command.id];if(f){const index=Math.min(this.frames[command.id].length-1,Math.max(0,command.frame||0));if(f[index]!==undefined)sprite.alpha*=f[index];}if(effectsLayer&&/explosion|death|scribble-burst/.test(command.id)){effectsLayer.addChild(sprite);const a=A.assets[command.id],sx=Math.abs(sprite.scale.x),sy=Math.abs(sprite.scale.y),w=sprite.texture.orig.width*sx,h=sprite.texture.orig.height*sy,px=a.pivot[0],py=a.pivot[1];sprite.x=Math.max(4+w*px,Math.min(1436-w*(1-px),sprite.x));sprite.y=Math.max(4+h*py,Math.min(776-h*(1-py),sprite.y));}return sprite};
 const result={applied:true,paddedFrames:padded,repairedEffectFrames:repaired,sourceAtlasBytesUnchanged:true,dispose(){if(r.inkTags)r.inkTags.visible=oldInkVisibility;if(effectsLayer){for(const child of [...effectsLayer.children])r.world.addChild(child);effectsLayer.destroy({children:false});}r.sprite=originalSprite;for(const[id,frames]of Object.entries(originalFrames))r.frames[id]=frames;for(const t of created)t.destroy(false);delete r.no2SpritePresentation;}};
 r.no2SpritePresentation=result;return result;
}
g.No2DefenderArt={install};
})(globalThis);

'use strict';
(function(g){
function makeModule(n){return Object.freeze({...n,contractVersion:1,fixedStep:1/120,scoring:{tableId:n.highScoreTableId,order:'descending',limit:10,initials:3},perGameSettings:n.settings,input:{map:n.inputMap,rebindable:true},init(seed,services={}){if(n.available){if(n.id==='erasteroids')return new ErasteroidsCore.ErasteroidsEngine(seed);if(n.id==='gym-class-pong')return new GymPongCore.PongEngine(seed);if(n.id==='detention-breakout')return new DetentionBreakoutCore.BreakoutEngine(seed);if(n.id==='space-substitutes')return new SpaceSubstitutesCore.InvadersEngine(seed);if(n.id==='lunch-lander')return new LunchLanderCore.LanderEngine(seed);if(n.id==='spitball-command')return new SpitballCommandCore.MissileEngine(seed);if(n.id==='snack-man')return new SnackManCore.PacEngine(seed);if(n.id==='recess-zone')return new RecessZoneCore.ZoneEngine(seed);if(n.id==='galgebra')return new GalgebraCore.GalaxianEngine(seed);if(n.id==='centigrade')return new CentigradeCore.CentipedeEngine(seed);if(n.id==='froggology')return new FroggologyCore.FroggerEngine(seed);if(n.id==='home-ec-scramble')return new BurgerCore.BurgerEngine(seed);if(n.id==='testpest')return new TestpestCore.TempestEngine(seed);if(n.id==='quiz')return new QuizCore.QixEngine(seed);if(n.id==='dunce-kong')return new KongCore.KongEngine(seed);if(n.id==='q-nerd')return new QnerdCore.QbertEngine(seed);if(n.id==='dig-doug')return new DigDougCore.DigDugEngine(seed);if(n.id==='class-of-2084')return new RobotronCore.RobotronEngine(seed);if(n.id==='jock-joust')return new JockJoustCore.JoustEngine(seed);if(n.id==='mystery-meat-time')return new FoodFightCore.FoodFightEngine(seed);if(n.id==='hall-patrol')return new HallPatrolCore.PatrolEngine(seed);if(n.id==='term-paperboy')return new PaperboyCore.PaperboyEngine(seed);if(n.id==='locker-gauntlet')return new GauntletCore.GauntletEngine(seed);if(!services.core)throw Error('Defender core required');return new services.core.ScribbleEngine(seed)}return{seed:seed>>>0,page:'title',ticks:0,score:0}},update(state,input,dt=1/120){if(n.available)state.step(dt,input);else state.ticks++},drawList(state,services={}){if(n.available){if(n.id==='erasteroids'||n.id==='gym-class-pong'||n.id==='detention-breakout'||n.id==='space-substitutes'||n.id==='lunch-lander'||n.id==='spitball-command'||n.id==='snack-man'||n.id==='recess-zone'||n.id==='galgebra'||n.id==='centigrade'||n.id==='froggology'||n.id==='home-ec-scramble'||n.id==='testpest'||n.id==='quiz'||n.id==='dunce-kong'||n.id==='q-nerd'||n.id==='dig-doug'||n.id==='class-of-2084'||n.id==='jock-joust'||n.id==='mystery-meat-time'||n.id==='hall-patrol'||n.id==='term-paperboy'||n.id==='locker-gauntlet')return state.snapshot();if(!services.scene)throw Error('Defender scene required');return services.scene.draw(state,services.meta||{})}return{sprites:[{id:'still-blank',x:512,y:360,w:384}],texts:[],paper:n.paperAsset}},attract(state){return n.available?state.pilot():{}},tests(services={}){if(n.id==='erasteroids')return{passed:ErasteroidsTests.run(ErasteroidsCore,()=>{})};if(n.id==='gym-class-pong')return{passed:GymPongTests.run(GymPongCore,()=>{})};if(n.id==='detention-breakout')return{passed:DetentionBreakoutTests.run(DetentionBreakoutCore,()=>{})};if(n.id==='space-substitutes')return{passed:SpaceSubstitutesTests.run(SpaceSubstitutesCore,()=>{})};if(n.id==='lunch-lander')return{passed:LunchLanderTests.run(LunchLanderCore,()=>{})};if(n.id==='spitball-command')return{passed:SpitballCommandTests.run(SpitballCommandCore,()=>{})};if(n.id==='snack-man')return{passed:SnackManTests.run(SnackManCore,()=>{})};if(n.id==='recess-zone')return{passed:RecessZoneTests.run(RecessZoneCore,()=>{})};if(n.id==='galgebra')return{passed:GalgebraTests.run(GalgebraCore,()=>{})};if(n.id==='centigrade')return{passed:CentigradeTests.run(CentigradeCore,()=>{})};if(n.id==='froggology')return{passed:FroggologyTests.run(FroggologyCore,()=>{})};if(n.id==='home-ec-scramble')return{passed:BurgerTests.run(BurgerCore,()=>{})};if(n.id==='testpest')return{passed:TestpestTests.run(TestpestCore,()=>{})};if(n.id==='quiz')return{passed:QuizTests.run(QuizCore,()=>{})};if(n.id==='dunce-kong')return{passed:KongTests.run(KongCore,()=>{})};if(n.id==='q-nerd')return{passed:QnerdTests.run(QnerdCore,()=>{})};if(n.id==='dig-doug')return{passed:DigDougTests.run(DigDougCore,()=>{})};if(n.id==='class-of-2084')return{passed:RobotronTests.run(RobotronCore,()=>{})};if(n.id==='jock-joust')return{passed:JockJoustTests.run(JockJoustCore,()=>{})};if(n.id==='mystery-meat-time')return{passed:FoodFightTests.run(FoodFightCore,()=>{})};if(n.id==='hall-patrol')return{passed:HallPatrolTests.run(HallPatrolCore,()=>{})};if(n.id==='term-paperboy')return{passed:PaperboyTests.run(PaperboyCore,()=>{})};if(n.id==='locker-gauntlet')return{passed:GauntletTests.run(GauntletCore,()=>{})};return n.available?services.api.tests.run():{passed:1,stillBlank:true}},highScores(save){return save.scores(n.id)}})}
const modules=Object.fromEntries(No2Catalog.notebooks.map(n=>[n.id,makeModule(n)]));
class DefenderAdapter{
 constructor(services){this.services=services;this.frame=null;this.api=null;this.token=0;this.suspended=false;this.unlisten=null;this.lastClose=null}
 async mount(container,seed=1981){if(this.frame)return this.api;const token=++this.token,bytes=Uint8Array.from(atob(ArcadePacks.defenderGzip),c=>c.charCodeAt(0));const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));let html=await new Response(stream).text();html=No2PixiCsp.embed(html);if(token!==this.token)return null;
 // Keep the baseline source intact. Composition changes only service wiring,
 // shared Pixi ownership, and the one legacy typographic dash in UI copy.
 html=html.replace('if(engine.score>high)',"if(mode!=='demo'&&engine.score>high)");
 html=html.replaceAll('\u2014',' - ').replace(/<script>([\s\S]*?)<\/script>/g,(whole,code)=>code.includes('PixiJS - v8.6.6')?'<script>globalThis.PIXI=parent.PIXI;<\/script>':whole);
 html=html.replace('<head>','<head><script>'+ArcadePacks.defenderPrelude.replace(/<\/script/gi,'<\\/script')+'<\/script>');
 const frame=document.createElement('iframe');frame.id='defender-frame';frame.title='Scribble Defender play page';frame.allow='autoplay; gamepad; fullscreen';frame.allowFullscreen=true;frame.setAttribute('data-notebook','scribble-defender');this.frame=frame;
 const ready=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;this.timeout=setTimeout(()=>reject(Error('The notebook did not finish opening.')),25000)});
 container.appendChild(frame);html=html.replace('</head>','<style>'+(globalThis.No2PresentationFonts||'')+'body,button,input,select{font-family:Schoolhand,sans-serif!important}h1,h2{font-family:SchoolMarker,sans-serif!important}</style></head>');frame.srcdoc=html;try{const api=await ready;if(token!==this.token)return null;No2DefenderArt.install(api,frame.contentWindow,No2DefenderSpriteConfig);api.newGame(seed);api.setSimulationPaused(false);for(const id of ['cover','lobby','menu'])frame.contentDocument.getElementById(id).classList.add('hidden');api.render();frame.contentWindow.focus();return api}catch(error){if(token===this.token)await this.destroy();throw error}
 }
 onReady(api,win){if(!this.frame||win!==this.frame.contentWindow)return;clearTimeout(this.timeout);this.api=api;const host=globalThis.No2;if(host){win.addEventListener?.('keydown',()=>{host.prompts.lastDevice='keyboard';host.prompts.touch=false});win.addEventListener?.('pointerdown',e=>{host.prompts.touch=e.pointerType==='touch';host.prompts.lastDevice=host.prompts.touch?'touch':'keyboard'})}this.unbridge=globalThis.No2Repairs?.bridge(win,host);this.unlisten=this.services.audio.attach(api.audio);const originalEmit=api.engine.emit.bind(api.engine),save=this.services.save;api.engine.emit=function(type,data={}){originalEmit(type,data);if(api.get().mode!=='demo'&&['death','gameover','tally','saved','kill'].includes(type))save.record('scribble-defender',type,{...data,score:this.score})};this.resolve(api)}
 onError(message){clearTimeout(this.timeout);this.reject?.(Error(message))}
 suspend(){if(!this.api||this.suspended)return;this.wasPaused=this.api.get().paused;if(!this.wasPaused&&this.api.get().mode==='play')this.api.pause();this.api.setSimulationPaused(true);this.api.audio.thrusting(false);this.suspended=true}
 resume(){if(!this.api)return;if(this.suspended&&!this.wasPaused&&this.api.get().paused)this.api.pause();this.api.setSimulationPaused(false);this.suspended=false;this.frame.contentWindow.focus()}
 async destroy(){++this.token;clearTimeout(this.timeout);const reject=this.reject;this.resolve=this.reject=null;reject?.(Error('Notebook opening cancelled.'));if(!this.frame)return;const frame=this.frame,a=this.api,unlisten=this.unlisten;this.frame=null;this.api=null;this.unlisten=null;this.suspended=false;unlisten?.();this.unbridge?.();this.unbridge=null;let textures=0;try{if(a){a.setSimulationPaused(true);a.audio.thrusting(false);await a.audio.context?.close();const r=a.renderer;r.no2SpritePresentation?.dispose();for(const t of Object.values(r.textures)){if(!t.destroyed){t.destroy(true);textures++}}const gl=r.app.renderer.gl;gl.getExtension('WEBGL_lose_context')?.loseContext();r.app.destroy({removeView:true},{children:true,texture:false,textureSource:false})}}catch(e){console.warn('Notebook close:',e.message)}this.lastClose={destroyedAssetTextures:textures,frameRemoved:true};frame.remove();}
 memory(){if(!this.api)return{active:false,atlasBytes:0,assetTextures:0,lastClose:this.lastClose};const a=this.api.renderer;return{active:true,atlasBytes:this.frame.contentWindow.ScribbleAssets.atlasBytes,assetTextures:Object.keys(a.textures).length,backend:a.info()}}
}
g.No2Modules={modules,makeModule,DefenderAdapter};if(typeof module!=='undefined')module.exports=g.No2Modules;
})(globalThis);

