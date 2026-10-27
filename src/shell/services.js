
'use strict';
(function(g){
const PREFIX='No2Arcade:',clone=x=>JSON.parse(JSON.stringify(x));
const cleanRows=rows=>Array.isArray(rows)?rows.filter(x=>x&&Number.isFinite(x.score)&&x.score>=0&&/^[A-Z0-9]{3}$/.test(x.name)).map(x=>({name:x.name,score:Math.floor(x.score)})).sort((a,b)=>b.score-a.score).slice(0,10):[];
class SafeStorage{
 constructor(provider){this.provider=provider;this.memory=new Map();this.durable=true;this.errors=[];this.listeners=new Set()}
 raw(key){if(this.memory.has(key))return this.memory.get(key);try{const value=this.provider?.getItem(key)??null;if(value!==null)this.memory.set(key,value);return value}catch(e){this.fail(e);return null}}
 read(key,fallback){try{const value=this.raw(key);return value===null?clone(fallback):JSON.parse(value)}catch{return clone(fallback)}}
 fail(e){this.durable=false;this.errors.push(String(e?.message||e));for(const fn of this.listeners)fn(false)}
 writeRaw(key,value){value=String(value);this.memory.set(key,value);try{if(!this.provider)throw Error('Storage unavailable');this.provider.setItem(key,value);return true}catch(e){this.fail(e);return false}}
 write(key,value){return this.writeRaw(key,JSON.stringify(value))}
 remove(key){this.memory.delete(key);try{this.provider?.removeItem(key)}catch(e){this.fail(e)}}
}
class ArcadeSave{
 constructor(storage,catalog){this.storage=storage;this.catalog=catalog;this.events=new Set();this.migration=this.migrateLegacy();this.settings={allUnlocked:true,manualComic:false,playIntroAtStartup:true,masterVolume:1,sound:true,reduced:false,...storage.read(PREFIX+'settings',{})};const uxV041=storage.read(PREFIX+'ux-correction-v041',false);if(!uxV041){this.settings.allUnlocked=true;storage.write(PREFIX+'settings',this.settings);storage.write(PREFIX+'ux-correction-v041',true)}this.settings.masterVolume=Math.max(0,Math.min(1,Number(this.settings.masterVolume)||0));this.progress={day:1,visited:[],achievements:[],...storage.read(PREFIX+'progress',{})};this.progress.day=Math.max(1,Math.min(365,Number(this.progress.day)||1));this.progress.visited=(Array.isArray(this.progress.visited)?this.progress.visited:[]).filter(id=>catalog.byId[id]);this.progress.achievements=Array.isArray(this.progress.achievements)?this.progress.achievements:[];this.layout=this.normalizeLayout((uxV041?storage.read(PREFIX+'desk',catalog.defaultDesk):catalog.defaultDesk)).filter(id=>this.unlocked(id));}
 key(id,part){if(!this.catalog.byId[id])throw Error('Unknown notebook');return PREFIX+'game:'+id+':'+part}
 normalizeLayout(list){return [...new Set(Array.isArray(list)?list:this.catalog.defaultDesk)].filter(id=>this.catalog.byId[id]).slice(0,this.catalog.deskLimit)}
 migrateLegacy(){const s=this.storage,marker=PREFIX+'migration:defender-v032',old={settings:'scribble-settings-v2',scores:'scribble-scores-v2',best:'scribble-defender-high'};if(s.read(marker,null))return{status:'already-migrated'};let ok=true,copied=[];for(const [part,key]of Object.entries(old)){const raw=s.raw(key);if(raw===null)continue;const dest=PREFIX+'game:scribble-defender:'+part;if(s.raw(dest)!==null)continue;let value;try{value=JSON.parse(raw)}catch{continue}if(part==='scores'){if(!Array.isArray(value))continue;value=cleanRows(value)}if(part==='settings'&&(!value||typeof value!=='object'||Array.isArray(value)))continue;if(part==='best'){value=Math.max(0,Number(value)||0)}if(!s.write(dest,value))ok=false;copied.push(part)}if(ok)ok=s.write(marker,{version:1,copied});return{status:ok?'migrated':'volatile',copied};}
 notify(){for(const fn of this.events)fn()}
 setSettings(patch){this.settings={...this.settings,...patch};this.storage.write(PREFIX+'settings',this.settings);if(patch.allUnlocked===false){this.layout=this.layout.filter(id=>this.unlocked(id));this.storage.write(PREFIX+'desk',this.layout)}this.notify()}
 lockReason(id){return this.catalog.byId[id]?'':'unknown notebook'}
 unlocked(id){return !!this.catalog.byId[id]}
 scoreEligible(id){const i=this.catalog.progression.indexOf(id);return this.settings.allUnlocked||i<=0||this.best(this.catalog.progression[i-1])>=this.catalog.unlockScore}
 pin(id,replace){if(!this.unlocked(id))return{ok:false,reason:'locked'};if(this.layout.includes(id))return{ok:true};if(this.layout.length>=this.catalog.deskLimit){if(!this.layout.includes(replace))return{ok:false,reason:'full'};this.layout=this.layout.map(x=>x===replace?id:x)}else this.layout.push(id);this.storage.write(PREFIX+'desk',this.layout);this.notify();return{ok:true}}
 unpin(id){this.layout=this.layout.filter(x=>x!==id);this.storage.write(PREFIX+'desk',this.layout);this.notify()}
 visit(id){if(!this.progress.visited.includes(id)){this.progress.visited.push(id);this.achieve('first-page');if(this.progress.visited.length>=8)this.achieve('eight-notebooks');this.storage.write(PREFIX+'progress',this.progress)}}
 achieve(id){if(!this.progress.achievements.includes(id)){this.progress.achievements.push(id);this.storage.write(PREFIX+'progress',this.progress)}}
 stats(id){return{deaths:0,runs:0,waves:0,...this.storage.read(this.key(id,'stats'),{})}}
 record(id,event,data={}){const stats=this.stats(id);if(event==='death')stats.deaths++;if(event==='gameover')stats.runs++;if(event==='tally'){stats.waves++;this.progress.day=Math.min(365,this.progress.day+1);this.achieve('one-more-page');this.storage.write(PREFIX+'progress',this.progress)}if(event==='saved')this.achieve('lab-partner');if((data.score||0)>=1000)this.achieve('ink-thousand');if(['death','gameover','tally'].includes(event))this.storage.write(this.key(id,'stats'),stats);}
 scores(id){return cleanRows(this.storage.read(this.key(id,'scores'),[]))}
 best(id){return Math.max(0,Number(this.storage.read(this.key(id,'best'),0))||0,...this.scores(id).map(x=>x.score))}
 total(){return this.catalog.notebooks.reduce((sum,n)=>sum+this.best(n.id),0)}
 resetScores(scope){if(scope!=='all'&&!this.catalog.byId[scope])throw Error('Unknown reset scope');for(const n of this.catalog.notebooks.filter(n=>scope==='all'||n.id===scope)){this.storage.write(this.key(n.id,'scores'),[]);this.storage.write(this.key(n.id,'best'),0)}this.notify()}
 facade(id){const map={'scribble-settings-v2':'settings','scribble-scores-v2':'scores','scribble-defender-high':'best'},self=this;const key=k=>self.key(id,map[k]||'legacy:'+k);return{getItem:k=>self.storage.raw(key(k)),setItem:(k,v)=>{self.storage.writeRaw(key(k),v);self.notify()},removeItem:k=>self.storage.remove(key(k)),clear(){throw Error('Notebook storage cannot clear other notebooks')}}}
 export(){for(const n of this.catalog.notebooks)for(const part of ['settings','scores','best','stats'])this.storage.raw(this.key(n.id,part));const values={};for(const [k,v]of this.storage.memory)if(k.startsWith(PREFIX))values[k]=v;return{format:'No2Arcade-save-v1',values}}
 import(data){
const pending=[];
if(data?.format==='No2Arcade-save-v1'&&data.values&&typeof data.values==='object'&&!Array.isArray(data.values)){
for(const[k,v]of Object.entries(data.values))if(k.startsWith(PREFIX)){if(typeof v!=='string')throw Error('Invalid notebook save entry.');JSON.parse(v);pending.push([k,v])}
if(!pending.length)throw Error('No notebook saves in that file');for(const[k,v]of pending)this.storage.writeRaw(k,v);return pending.length;
}
const keys=['scribble-settings-v2','scribble-scores-v2','scribble-defender-high'];for(const k of keys)if(data&&Object.hasOwn(data,k)){const value=typeof data[k]==='string'?data[k]:JSON.stringify(data[k]);JSON.parse(value);pending.push([k,value])}
if(!pending.length)throw Error('No notebook saves in that file');const facade=this.facade('scribble-defender');for(const[k,v]of pending)facade.setItem(k,v);return pending.length}


}
class ArcadeInput{
 constructor(){this.previous=[];this.focus=0;this.lastAxis=0}
 step(buttons,axes=[],time=0){const edge=i=>!!buttons[i]&&!this.previous[i],out={next:edge(13)||edge(15),previous:edge(12)||edge(14),select:edge(0),back:edge(1),desk:edge(8),intro:edge(3),shoulder:!!buttons[4],left:edge(14),right:edge(15)};if(Math.abs(axes[1]||0)>.6&&time-this.lastAxis>.22){out.next=axes[1]>0;out.previous=axes[1]<0;this.lastAxis=time}if(Math.abs(axes[0]||0)>.6&&Math.abs(axes[1]||0)<.6&&time-this.lastAxis>.22){out.right=axes[0]>0;out.left=axes[0]<0;out.next=out.right;out.previous=out.left;this.lastAxis=time}this.previous=[...buttons];return out}
}
g.No2Services={SafeStorage,ArcadeSave,ArcadeInput,cleanRows,PREFIX};if(typeof module!=='undefined')module.exports=g.No2Services;
})(globalThis);

