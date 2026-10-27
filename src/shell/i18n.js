'use strict';
// Languages (owner 2026-10-30): English is the source and the default; French, Spanish and German come from one table each
// (assets/i18n/<lang>.json: "exact" English line to translation, and "patterns" for lines with numbers or names in them).
// The translation is applied in two central places so no game or page has to change: every text node and label the page
// shows (a MutationObserver), and every PixiJS Text the games draw (its text setter). The 24 game names, initials, numbers
// and the songs are never in a table, so they pass through unchanged. No2I18n.collect gathers lines with no translation
// (tools/i18n-collect.mjs reads them) so nothing slips through.
(function(g){
const KEY='no2arcade:language',LANGS=['en','fr','es','de','it'],data=g.No2I18nData||{};
let lang='en';try{const s=g.localStorage?.getItem(KEY);if(LANGS.includes(s))lang=s}catch{}
const missing=new Set(),cache=new Map();
function table(){return data[lang]||null}
const KEEP=new Set();
function compile(){cache.clear();const t=table();if(!t)return;t._re=(t.patterns||[]).map(([re,out])=>[new RegExp(re),out]);t._out=new Set(Object.values(t.exact||{}))}
// "Key word" labels (a keycap and its action, as the buttons and the ruler name themselves): each half on its own.
const KEYS=/^(Esc|Enter|Space|Shift|Tab|Backspace|Up\+Down|Left\+Right|Up|Down|Left|Right|D-pad|stick|tap|hold|Menu|LB|RB|LT|RT|[A-Z]|[A-Z]\+[A-Z])\s(.+)$/;
// One line: exact match first (trimmed, keeping its surrounding spaces), then the patterns; untouched when unknown.
function tr(s){if(lang==='en'||typeof s!=='string'||!s.trim())return s;const t=table();if(!t)return s;if(cache.has(s))return cache.get(s);
 const m=s.match(/^(\s*)([\s\S]*?)(\s*)$/),core=m[2];let out=t.exact?.[core];
 if(out==null)for(const [re,rep]of t._re||[]){const mm=core.match(re);if(mm){out=rep.replace(/\$(\d+)/g,(_,i)=>num(mm[+i]??''));t._out.add(out);break}}
 if(out==null&&(t._out.has(core)||KEEP.has(core)))out=core;
 if(out==null){const km=core.match(KEYS);if(km){const w=t.exact?.[km[2]];if(w!=null){out=(t.exact?.[km[1]]??km[1])+' '+w;t._out.add(out)}}}
 if(out==null){if(No2I18n.collect&&/[a-z]{2}/i.test(core)&&!/^[\d\s.,:+\-x%]+$/.test(core))missing.add(core);out=core}
 const r=m[1]+out+m[3];cache.set(s,r);return r}
// A number captured from an English line is written the way the language writes it (12,340 -> 12 340 / 12.340).
const fmt={};function num(v){const tail=(v.match(/[.,]$/)||[''])[0];if(tail&&/\d[.,]$/.test(v)&&!/^-?\d{1,3}(,\d{3})+$/.test(v))v=v.slice(0,-1);else if(!tail||/^-?\d{1,3}(,\d{3})+$/.test(v)){}if(!/^-?\d{1,3}(,\d{3})+$/.test(v))return v+(tail&&!v.endsWith(tail)?tail:'');const n=Number(v.replace(/,/g,''));try{return (fmt[lang]??=new Intl.NumberFormat({fr:'fr-FR',es:'es-ES',de:'de-DE',it:'it-IT'}[lang])).format(n)+(tail&&!v.endsWith(tail)?tail:'')}catch{return v}}
// Multi-line canvas text: each line on its own.
function trText(s){return typeof s==='string'&&s.includes('\n')?s.split('\n').map(tr).join('\n'):tr(s)}
const SKIP=new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','CODE']);const ATTRS=['aria-label','title','placeholder','alt'];
const orig=new WeakMap(),origAttr=new WeakMap();
function doNode(n){if(n.nodeType===3){const p=n.parentNode;if(!p||SKIP.has(p.nodeName)||p.closest?.('[data-i18n=off]'))return;const src=orig.get(n)??n.nodeValue;const out=tr(src);if(out!==n.nodeValue){orig.set(n,src);n.nodeValue=out}else if(lang==='en'&&orig.has(n)){n.nodeValue=orig.get(n);orig.delete(n)}return}
 if(n.nodeType!==1||(SKIP.has(n.nodeName)&&n.nodeName!=='TEXTAREA'&&n.nodeName!=='INPUT')||n.closest?.('[data-i18n=off]'))return;/* a form field's placeholder and label are translated, never what is typed in it */const a=origAttr.get(n)||{};for(const k of ATTRS){if(!n.hasAttribute(k))continue;const src=a[k]??n.getAttribute(k),out=tr(src);if(out!==n.getAttribute(k)){a[k]=src;n.setAttribute(k,out)}}origAttr.set(n,a);
 for(const c of n.childNodes)doNode(c)}
let busy=false;const obs=typeof MutationObserver!=='undefined'?new MutationObserver(list=>{if(busy)return;busy=true;try{for(const m of list){if(m.type==='characterData')doNode(m.target);else if(m.type==='attributes')doNode(m.target);else for(const n of m.addedNodes)doNode(n)}}finally{busy=false}}):null;
function start(){if(!obs||!document.body)return;obs.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});busy=true;try{doNode(document.body)}finally{busy=false}}
// PixiJS Text: the games' words go through the table when they are set.
function patchPixi(){const P=g.PIXI;if(!P||P.__no2I18n)return;P.__no2I18n=true;for(const C of [P.Text,P.BitmapText,P.HTMLText].filter(Boolean)){const d=Object.getOwnPropertyDescriptor(C.prototype,'text')||Object.getOwnPropertyDescriptor(Object.getPrototypeOf(C.prototype),'text');if(!d||!d.set)continue;
 Object.defineProperty(C.prototype,'text',{configurable:true,get:d.get,set(v){this.__no2Src=v;d.set.call(this,trText(v))}})}}
function setLang(l){if(!LANGS.includes(l))return;lang=l;compile();try{g.localStorage?.setItem(KEY,l)}catch{}document.documentElement.lang=l;if(document.body){busy=true;try{doNode(document.body)}finally{busy=false}}g.dispatchEvent?.(new CustomEvent('no2-language',{detail:l}))}
const No2I18n={get lang(){return lang},langs:LANGS,colors:{en:'#3f8f4e',fr:'#2c5aa8',es:'#c0392b',de:'#d4a017',it:'#7d4a9e'},names:{en:'English',fr:'Français',es:'Español',de:'Deutsch',it:'Italiano'},t:tr,text:trText,set:setLang,collect:false,missing,chosen(){try{return LANGS.includes(g.localStorage?.getItem(KEY))}catch{return false}}};
No2I18n.keep=s=>{for(const x of s)KEEP.add(x)};g.No2I18n=No2I18n;compile();if(typeof document!=='undefined'){document.documentElement.lang=lang;patchPixi();if(document.body)start();else document.addEventListener('DOMContentLoaded',start)}
})(globalThis);
