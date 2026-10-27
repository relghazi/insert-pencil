
'use strict';
globalThis.No2Layout={measure(){const failures=[],boxes=[];for(const e of document.querySelectorAll('.book-button,.prop-button,#ruler-control')){if(e.offsetParent===null||No2.page!=='hub')continue;const r=e.getBoundingClientRect();boxes.push({id:e.id,x:r.x,y:r.y,w:r.width,h:r.height});if(r.left<0||r.top<0||r.right>innerWidth||r.bottom>innerHeight)failures.push('interactive crop: '+e.id)}return{screen:No2.page,textBoxes:boxes.length,boxes,failures}}};
