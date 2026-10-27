
'use strict';
(function(g){
const R=No2AssetData.registration,W=1672,H=941,physical={desk:R.deskCm,notebook:[21.6,27.9],composition:[19,24.8],sketchbook:[21,28],backpack:[30,42],pencil:[19,1.1],ruler:[30,4],eraser:[6,2.5],sharpener:[10,12],calculator:[12.8,8],sticky:[7.6,7.6]};
function solve(a,b){a=a.map((r,i)=>[...r,b[i]]);for(let i=0;i<b.length;i++){let k=i;for(let j=i+1;j<b.length;j++)if(Math.abs(a[j][i])>Math.abs(a[k][i]))k=j;[a[i],a[k]]=[a[k],a[i]];const d=a[i][i];if(Math.abs(d)<1e-10)throw Error('Invalid scene registration');for(let c=i;c<=b.length;c++)a[i][c]/=d;for(let j=0;j<b.length;j++)if(j!==i){const t=a[j][i];for(let c=i;c<=b.length;c++)a[j][c]-=t*a[i][c]}}return a.map(r=>r[b.length])}
function homography(from,to){const a=[],b=[];for(let i=0;i<4;i++){const[x,y]=from[i],[u,v]=to[i];a.push([x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]);b.push(u,v)}const m=solve(a,b);return p=>{const[x,y]=p,d=m[6]*x+m[7]*y+1;return[(m[0]*x+m[1]*y+m[2])/d,(m[3]*x+m[4]*y+m[5])/d]}}
const table=[[0,0],[R.deskCm[0],0],[R.deskCm[0],R.deskCm[1]],[0,R.deskCm[1]]],toPixel=homography(table,R.deskCorners),fromPixel=homography(R.deskCorners,table);
const slots=R.slots.map(s=>{const[x,y]=fromPixel(s.pixel);return{x,y,rotation:s.angle}});
function bookSize(n){return n?.family==='composition'?physical.composition:physical.notebook}
function fit(w,h){const scale=Math.min(w/W,h/H)*.96;return{scale,x:(w-W*scale)/2,y:(h-H*scale)/2,w:W,h:H}}
function cameraFor(layout,id){if(!id)return{x:R.deskCm[0]/2,y:R.deskCm[1]/2,height:90,rotation:0};if(id==='intro'){const[x,y]=fromPixel([1400,552]);return{x,y,height:34,rotation:0}}const s=slots[Math.max(0,layout.indexOf(id))]||slots[0];return{x:s.x,y:s.y,height:34,rotation:s.rotation}}
function phase(camera){return Math.max(0,Math.min(1,(90-(camera?.height??90))/56))}
function project(p,camera=cameraFor([],null),w=innerWidth,h=innerHeight){const f=fit(w,h),raw=toPixel(p),t=phase(camera),s=Math.min(w/53,h/36)*.93,a=-(camera.rotation||0),dx=p[0]-camera.x,dy=p[1]-camera.y,flat=[w/2+(dx*Math.cos(a)-dy*Math.sin(a))*s,h/2+(dx*Math.sin(a)+dy*Math.cos(a))*s];return[(f.x+raw[0]*f.scale)*(1-t)+flat[0]*t,(f.y+raw[1]*f.scale)*(1-t)+flat[1]*t]}
function rectQuad(cx,cy,w,h,a=0){const c=Math.cos(a),s=Math.sin(a);return[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([x,y])=>[cx+x*c-y*s,cy+x*s+y*c])}
function bounds(quad){const xs=quad.map(p=>p[0]),ys=quad.map(p=>p[1]);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}}
function propQuad(p){const[x,y,w,h]=p.pixelRect;return[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(fromPixel)}
function hub(layout,selected=null){const commands=[{id:'desk',quad:[[0,0],[W,0],[W,H],[0,H]].map(fromPixel),sourceRect:[0,0,W,H],background:true}],regions=[];
const add=(c,key,label)=>{commands.push(c);if(key)regions.push({...bounds(c.quad),quad:c.quad,key,id:c.id,label,notebook:!!c.notebook})};
const prop=id=>{const p=R.props.find(p=>p.id===id);if(p){if(id==='calculator'){const center=fromPixel([p.pixelRect[0]+p.pixelRect[2]/2,p.pixelRect[1]+p.pixelRect[3]/2]),a=fromPixel(p.polygon[0]),b=fromPixel(p.polygon[1]),angle=Math.atan2(b[1]-a[1],b[0]-a[0]);add({id,quad:rectQuad(center[0],center[1],12.8,8,angle),sourceRect:null,prop:true},p.key,p.label);}else add({id,quad:propQuad(p),sourceRect:p.pixelRect,prop:true},p.key,p.label);}};
for(const id of ['backpack','sharpener'])prop(id);
for(const i of [1,2,3,5]){const id=layout[i];if(id){const s=slots[i],n=No2Catalog.byId[id],size=bookSize(n);add({id:'thumb-'+id,quad:rectQuad(s.x,s.y,...size,s.rotation),notebook:true},id,n.title)}}
prop('ruler');
for(const i of [0,4]){const id=layout[i];if(id){const s=slots[i],n=No2Catalog.byId[id],size=bookSize(n);add({id:'thumb-'+id,quad:rectQuad(s.x,s.y,...size,s.rotation),notebook:true},id,n.title)}}
for(const id of ['eraser','calculator','sketchbook','sticky-achievements','sticky-scores','pencil','pencil-short'])prop(id);
add({id:'insert-pencil-v044',quad:[[500,690],[667,675],[675,714],[506,727]].map(fromPixel)});const help=fromPixel([1274,746]);add({id:'sticky-help',quad:rectQuad(help[0],help[1],7.6,7.6,-.12),help:true});
if(selected){const n=No2Catalog.byId[selected],s=slots[Math.max(0,layout.indexOf(selected))]||slots[0],size=bookSize(n);add({id:n.paperAsset,quad:rectQuad(s.x,s.y,size[0]*2,size[1],s.rotation),paper:true})}
for(const r of regions){const p=R.props.find(p=>p.id===r.id);if(p?.polygon){r.quad=r.id==='calculator'?commands.find(c=>c.id===r.id).quad:p.polygon.map(fromPixel);Object.assign(r,bounds(r.quad));}}return{width:R.deskCm[0],height:R.deskCm[1],commands,regions}}
function screenRegion(r,camera,w=innerWidth,h=innerHeight){const quad=r.quad.map(p=>project(p,camera,w,h));return{...bounds(quad),quad}}
function notebookRect(w,h,layout,id,camera){const s=slots[Math.max(0,layout.indexOf(id))]||slots[0],size=bookSize(No2Catalog.byId[id]),r=screenRegion({quad:rectQuad(s.x,s.y,size[0]*2,size[1],s.rotation)},camera||cameraFor(layout,id),w,h);return{...r,scale:r.w/(size[0]*2)}}
g.No2Scene={W,H,physical,slots,bookSize,fit,cameraFor,hub,notebookRect,project,fromPixel,toPixel,phase,rectQuad,screenRegion,bounds};if(typeof module!=='undefined')module.exports=g.No2Scene;
})(globalThis);

