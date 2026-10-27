'use strict';
(function(g){
// Clean sprites on every screen (owner 2026-10-29, after the Scribble Defender pass): the games already draw at the canvas's
// real pixel size; image textures also get mipmaps and smooth scaling, so sprites drawn smaller than their art stay clean.
if(g.PIXI&&!g.PIXI.__no2Sharp){const P=g.PIXI;P.__no2Sharp=true;const from=P.Texture.from.bind(P.Texture);
 P.Texture.from=(src,...rest)=>(typeof HTMLImageElement!=='undefined'&&src instanceof HTMLImageElement)||(typeof HTMLCanvasElement!=='undefined'&&src instanceof HTMLCanvasElement&&src.width>64)?from({resource:src,autoGenerateMipmaps:true,scaleMode:'linear'},...rest):from(src,...rest)}
// D-pad and left stick are one control everywhere (owner 2026-10-28): every reader of navigator.getGamepads (the shell,
// the comic and all 24 games) gets the pad with the two merged. The stick pushed past halfway presses that D-pad
// direction; a D-pad direction with the stick at rest tilts the stick fully. A pad without the standard layout that
// reports its D-pad as a hat switch (axis 9) has the hat turned into D-pad buttons first.
const nativePads=typeof navigator!=='undefined'&&navigator.getGamepads?.bind(navigator);
function hat(v){if(!(Math.abs(v)<=1.05))return 0;const k=Math.round((v+1)/(2/7))&7;return[1,1|2,2,2|4,4,4|8,8,8|1][k]}// up 1, right 2, down 4, left 8
// Android-mode pads (8BitDo and others, owner 2026-10-28) report the Android gamepad layout without the standard mapping:
// A 0, B 1, X 3, Y 4, L1 6, R1 7, L2 8, R2 9, Select 10, Start 11, Home 12, L3 13, R3 14. They are put in standard order
// first, so every button keeps its printed letter.
const ANDROID=[0,1,3,4,6,7,8,9,10,11,13,14,-1,-1,-1,-1,12];
// Xbox pads over Bluetooth without the standard mapping (an Elite Series 2 or older firmware on a Mac, owner 2026-10-30)
// report the same raw HID order and are put in standard order the same way.
function remap(p){if(p.mapping==='standard'||!/android|8bitdo|xbox|045e/i.test(p.id||'')||p.buttons.length<13)return p.buttons;return ANDROID.map(i=>i<0?{pressed:false,touched:false,value:0}:p.buttons[i])}
// A controller set up by the player (owner 2026-10-30, settings, set up my controller): for each standard button the raw
// button that player pressed for it, saved per controller id; applied before everything else. Nothing passes through
// while the setup page is listening.
let padMaps={};try{padMaps=JSON.parse(localStorage.getItem('no2arcade:padmaps')||'{}')||{}}catch{}
globalThis.No2PadSetup={raw:()=>Array.from((nativePads&&nativePads())||[]).filter(p=>p?.connected),maps:()=>padMaps,save(id,map){if(map)padMaps[id]=map;else delete padMaps[id];try{localStorage.setItem('no2arcade:padmaps',JSON.stringify(padMaps))}catch{}},listening:false};
function custom(p){const m=padMaps[p.id];if(!m)return null;return Array.from({length:Math.max(17,p.buttons.length)},(_,i)=>p.buttons[m[i]!=null?m[i]:i])}
function mergePad(p){if(!p)return p;if(globalThis.No2PadSetup.listening)return{id:p.id,index:p.index,connected:p.connected,mapping:p.mapping,timestamp:p.timestamp,axes:p.axes.map(()=>0),buttons:p.buttons.map(()=>({pressed:false,touched:false,value:0}))};const raw=custom(p)||remap(p),B=Array.from({length:Math.max(17,raw.length)},(_,i)=>{const b=raw[i];return{pressed:!!b?.pressed,touched:!!b?.touched,value:b?.value||0}}),ax=Array.from(p.axes||[]);
 const on=i=>{if(!B[i].pressed)B[i]={pressed:true,touched:true,value:1}};
 if(p.mapping!=='standard'&&ax.length>9){const h=hat(ax[9]);if(h&1)on(12);if(h&4)on(13);if(h&8)on(14);if(h&2)on(15)}
 const x=ax[0]||0,y=ax[1]||0;if(y<-.5)on(12);if(y>.5)on(13);if(x<-.5)on(14);if(x>.5)on(15);
 if(Math.hypot(x,y)<.25){const dx=(B[15].pressed?1:0)-(B[14].pressed?1:0),dy=(B[13].pressed?1:0)-(B[12].pressed?1:0);if(dx||dy){ax[0]=dx;ax[1]=dy}}
 return{id:p.id,index:p.index,connected:p.connected,mapping:p.mapping,timestamp:p.timestamp,axes:ax,buttons:B}}
if(nativePads){try{Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>Array.from(nativePads()||[]).map(mergePad)})}catch{}}
// Shared snapshot keeps host and notebook on the same physical controller.
const padState={index:null,id:'',mapping:'',connected:false,error:null,frames:0,lastActive:0};let snapshot=null;
function poll(){padState.frames++;try{if(typeof navigator.getGamepads!=='function')throw Error('Controller input is unavailable in this browser.');const pads=Array.from(navigator.getGamepads()||[]).filter(p=>p?.connected),active=pads.find(p=>p.buttons.some(b=>b.pressed)||p.axes.some(a=>Math.abs(a)>.25));const pad=active||pads.find(p=>p.index===padState.index)||pads[0];snapshot=pad||null;Object.assign(padState,{index:pad?.index??null,id:pad?.id||'',mapping:pad?.mapping||'',connected:!!pad,error:null});if(active)padState.lastActive=performance.now();return pad}catch(e){snapshot=null;padState.connected=false;padState.error=e.name+': '+e.message;return null}}
function bridge(win,host){const native=win.navigator.getGamepads?.bind(win.navigator),descriptor=Object.getOwnPropertyDescriptor(win.navigator,'getGamepads');let installed=false;try{Object.defineProperty(win.navigator,'getGamepads',{configurable:true,value(){const p=snapshot;if(!p||!host.gameInputEnabled())return [];/* Xbox layout (owner 2026-10-25): A fire, X smart bomb, Y hyperspace, RT thrust, LT reverse, Menu pause, stick and D-pad fly; B, LB, RB and View belong to the notebook. Radial stick dead zone with rescale. */const src=Array.from(p.buttons,b=>({pressed:b.pressed,touched:b.touched,value:b.value})),off={pressed:false,touched:false,value:0},at=i=>src[i]||off,buttons=src.map(()=>off);buttons[0]=at(0);buttons[1]=at(2);buttons[2]=at(6);buttons[3]=at(3);buttons[7]=at(7);buttons[9]=at(9);for(const i of [12,13,14,15])buttons[i]=at(i);const ax=Array.from(p.axes),x=ax[0]||0,y=ax[1]||0,m=Math.hypot(x,y),k=m<.22?0:Math.min(1,(m-.22)/.7)/m;ax[0]=x*k;ax[1]=y*k;return [{id:p.id,index:p.index,connected:p.connected,mapping:p.mapping,timestamp:p.timestamp,axes:ax,buttons,hapticActuators:[]}];}});installed=true}catch(e){padState.error='Notebook controller bridge: '+e.message}const escape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();(host.escape||host.close)()}};win.addEventListener('keydown',escape,true);return()=>{win.removeEventListener('keydown',escape,true);if(installed){if(descriptor)Object.defineProperty(win.navigator,'getGamepads',descriptor);else delete win.navigator.getGamepads;if(native&&typeof win.navigator.getGamepads!=='function')Object.defineProperty(win.navigator,'getGamepads',{value:native,configurable:true})}}}
function objectPoint(c,world,textureV,renderer,camera,w=innerWidth,h=innerHeight){const p=No2Scene.project(world,camera,w,h),level=renderer?.levels.get(c.id)||0;if(!level)return p;const center=No2Scene.project(c.quad.reduce((s,p)=>[s[0]+p[0]/4,s[1]+p[1]/4],[0,0]),camera,w,h),dip=performance.now()<(renderer.pressUntil||0)?-.7:1,scale=1+level*.09*dip,tilt=level*.03,raised=level*18*No2Scene.fit(w,h).scale*dip;return[center[0]+(p[0]-center[0])*(scale+(textureV-.5)*tilt),center[1]+(p[1]-center[1])*scale-raised]}
function hitRegion(r,renderer,camera,w=innerWidth,h=innerHeight){const c=renderer?.sceneModel?.commands.find(c=>c.id===r.id);if(!c)return No2Scene.screenRegion(r,camera,w,h);const quad=r.quad.map((p,i)=>{const v=c.sourceRect?(No2Scene.toPixel(p)[1]-c.sourceRect[1])/c.sourceRect[3]:i<2?0:1;return objectPoint(c,p,v,renderer,camera,w,h)});return{...No2Scene.bounds(quad),quad}}
function rulerTrack(scene,camera,w=innerWidth,h=innerHeight,renderer=globalThis.No2?.services?.renderer){scene??=renderer?.sceneModel||No2Scene.hub(globalThis.No2?.services?.save.layout||No2Catalog.defaultDesk);const c=scene.commands.find(c=>c.id==='ruler'),q=scene.regions.find(r=>r.id==='ruler').quad,left=[(q[0][0]+q[3][0])/2,(q[0][1]+q[3][1])/2],right=[(q[1][0]+q[2][0])/2,(q[1][1]+q[2][1])/2];return [.08,.92].map(t=>{const world=left.map((v,i)=>v*(1-t)+right[i]*t),v=c.sourceRect?(No2Scene.toPixel(world)[1]-c.sourceRect[1])/c.sourceRect[3]:.5;return objectPoint(c,world,v,renderer,camera,w,h)})}
function rulerValue(x,y,camera){const[a,b]=rulerTrack(null,camera),dx=b[0]-a[0],dy=b[1]-a[1];return Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)))}
const vertex=`in vec2 aPosition;out highp vec2 vTextureCoord;uniform highp vec4 uInputSize;uniform highp vec4 uOutputFrame;uniform highp vec4 uOutputTexture;void main(){vec2 p=aPosition*uOutputFrame.zw+uOutputFrame.xy;p.x=p.x*(2.0/uOutputTexture.x)-1.0;p.y=p.y*(2.0*uOutputTexture.z/uOutputTexture.y)-uOutputTexture.z;gl_Position=vec4(p,0.0,1.0);vTextureCoord=aPosition*(uOutputFrame.zw*uInputSize.zw);}`;
const fragment=`in highp vec2 vTextureCoord;uniform sampler2D uTexture;uniform highp vec4 uInputSize;uniform float uStrength;out vec4 finalColor;void main(){vec4 c=texture(uTexture,vTextureCoord);vec2 d=uInputSize.zw*2.5;float n=min(min(texture(uTexture,vTextureCoord+vec2(d.x,0)).a,texture(uTexture,vTextureCoord-vec2(d.x,0)).a),min(texture(uTexture,vTextureCoord+vec2(0,d.y)).a,texture(uTexture,vTextureCoord-vec2(0,d.y)).a));float e=max(0.0,c.a-n)*uStrength;finalColor=vec4(min(vec3(c.a),c.rgb+vec3(0.25,0.15,0.04)*e),c.a);}`;
function rim(mesh,level){if(mesh.no2RimFailed){mesh.filters=null;return}try{if(!globalThis.document)return;if(level<=.002){mesh.filters=null;return}if(!mesh.no2RimFilter)mesh.no2RimFilter=new PIXI.Filter({glProgram:PIXI.GlProgram.from({vertex,fragment,name:'alpha-only-warm-edge'}),resources:{edgeUniforms:{uStrength:{value:level*1.6,type:'f32'}}}});mesh.no2RimFilter.resources.edgeUniforms.uniforms.uStrength=level*1.6;mesh.filters=[mesh.no2RimFilter]}catch(error){mesh.filters=null;mesh.visible=true;mesh.no2RimFailed=String(error.message||error)}}
g.No2Repairs={mergePad,objectPoint,hitRegion,rim,poll,bridge,padState,rulerTrack,rulerValue,get snapshot(){return snapshot}};
})(globalThis);

'use strict';
(function(g){
function install(PIXI){if(!PIXI||PIXI.no2CspCompat)return false;if(PIXI.VERSION!=='8.6.6')throw Error('CSP compatibility requires pinned PixiJS 8.6.6.');
(function(){
/*!
 * PixiJS - v8.6.6
 * Compiled Wed, 18 Dec 2024 12:46:36 UTC
 *
 * PixiJS is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license
 */
this.PIXI = this.PIXI || {};
var unsafe_eval_js = (function (exports) {
    'use strict';

    "use strict";
    class ViewableBuffer {
      constructor(sizeOrBuffer) {
        if (typeof sizeOrBuffer === "number") {
          this.rawBinaryData = new ArrayBuffer(sizeOrBuffer);
        } else if (sizeOrBuffer instanceof Uint8Array) {
          this.rawBinaryData = sizeOrBuffer.buffer;
        } else {
          this.rawBinaryData = sizeOrBuffer;
        }
        this.uint32View = new Uint32Array(this.rawBinaryData);
        this.float32View = new Float32Array(this.rawBinaryData);
        this.size = this.rawBinaryData.byteLength;
      }
      /** View on the raw binary data as a `Int8Array`. */
      get int8View() {
        if (!this._int8View) {
          this._int8View = new Int8Array(this.rawBinaryData);
        }
        return this._int8View;
      }
      /** View on the raw binary data as a `Uint8Array`. */
      get uint8View() {
        if (!this._uint8View) {
          this._uint8View = new Uint8Array(this.rawBinaryData);
        }
        return this._uint8View;
      }
      /**  View on the raw binary data as a `Int16Array`. */
      get int16View() {
        if (!this._int16View) {
          this._int16View = new Int16Array(this.rawBinaryData);
        }
        return this._int16View;
      }
      /** View on the raw binary data as a `Int32Array`. */
      get int32View() {
        if (!this._int32View) {
          this._int32View = new Int32Array(this.rawBinaryData);
        }
        return this._int32View;
      }
      /** View on the raw binary data as a `Float64Array`. */
      get float64View() {
        if (!this._float64Array) {
          this._float64Array = new Float64Array(this.rawBinaryData);
        }
        return this._float64Array;
      }
      /** View on the raw binary data as a `BigUint64Array`. */
      get bigUint64View() {
        if (!this._bigUint64Array) {
          this._bigUint64Array = new BigUint64Array(this.rawBinaryData);
        }
        return this._bigUint64Array;
      }
      /**
       * Returns the view of the given type.
       * @param type - One of `int8`, `uint8`, `int16`,
       *    `uint16`, `int32`, `uint32`, and `float32`.
       * @returns - typed array of given type
       */
      view(type) {
        return this[`${type}View`];
      }
      /** Destroys all buffer references. Do not use after calling this. */
      destroy() {
        this.rawBinaryData = null;
        this._int8View = null;
        this._uint8View = null;
        this._int16View = null;
        this.uint16View = null;
        this._int32View = null;
        this.uint32View = null;
        this.float32View = null;
      }
      /**
       * Returns the size of the given type in bytes.
       * @param type - One of `int8`, `uint8`, `int16`,
       *   `uint16`, `int32`, `uint32`, and `float32`.
       * @returns - size of the type in bytes
       */
      static sizeOf(type) {
        switch (type) {
          case "int8":
          case "uint8":
            return 1;
          case "int16":
          case "uint16":
            return 2;
          case "int32":
          case "uint32":
          case "float32":
            return 4;
          default:
            throw new Error(`${type} isn't a valid view type`);
        }
      }
    }

    "use strict";
    function createIndicesForQuads(size, outBuffer = null) {
      const totalIndices = size * 6;
      if (totalIndices > 65535) {
        outBuffer || (outBuffer = new Uint32Array(totalIndices));
      } else {
        outBuffer || (outBuffer = new Uint16Array(totalIndices));
      }
      if (outBuffer.length !== totalIndices) {
        throw new Error(`Out buffer length is incorrect, got ${outBuffer.length} and expected ${totalIndices}`);
      }
      for (let i = 0, j = 0; i < totalIndices; i += 6, j += 4) {
        outBuffer[i + 0] = j + 0;
        outBuffer[i + 1] = j + 1;
        outBuffer[i + 2] = j + 2;
        outBuffer[i + 3] = j + 0;
        outBuffer[i + 4] = j + 2;
        outBuffer[i + 5] = j + 3;
      }
      return outBuffer;
    }

    "use strict";

    function generateParticleUpdateFunction(properties) {
      return {
        dynamicUpdate: generateUpdateFunction$1(properties, true),
        staticUpdate: generateUpdateFunction$1(properties, false)
      };
    }
    function generateUpdateFunction$1(properties, dynamic) {
      const funcFragments = [];
      funcFragments.push(`
      
        var index = 0;

        for (let i = 0; i < ps.length; ++i)
        {
            const p = ps[i];

            `);
      let offset = 0;
      for (const i in properties) {
        const property = properties[i];
        if (dynamic !== property.dynamic)
          continue;
        funcFragments.push(`offset = index + ${offset}`);
        funcFragments.push(property.code);
        const attributeInfo = PIXI.getAttributeInfoFromFormat(property.format);
        offset += attributeInfo.stride / 4;
      }
      funcFragments.push(`
            index += stride * 4;
        }
    `);
      funcFragments.unshift(`
        var stride = ${offset};
    `);
      const functionSource = funcFragments.join("\n");
      return new Function("ps", "f32v", "u32v", functionSource);
    }

    "use strict";
    class ParticleBuffer {
      constructor(options) {
        this._size = 0;
        this._generateParticleUpdateCache = {};
        var _a;
        const size = this._size = (_a = options.size) != null ? _a : 1e3;
        const properties = options.properties;
        let staticVertexSize = 0;
        let dynamicVertexSize = 0;
        for (const i in properties) {
          const property = properties[i];
          const attributeInfo = PIXI.getAttributeInfoFromFormat(property.format);
          if (property.dynamic) {
            dynamicVertexSize += attributeInfo.stride;
          } else {
            staticVertexSize += attributeInfo.stride;
          }
        }
        this._dynamicStride = dynamicVertexSize / 4;
        this._staticStride = staticVertexSize / 4;
        this.staticAttributeBuffer = new ViewableBuffer(size * 4 * staticVertexSize);
        this.dynamicAttributeBuffer = new ViewableBuffer(size * 4 * dynamicVertexSize);
        this.indexBuffer = createIndicesForQuads(size);
        const geometry = new PIXI.Geometry();
        let dynamicOffset = 0;
        let staticOffset = 0;
        this._staticBuffer = new PIXI.Buffer({
          data: new Float32Array(1),
          label: "static-particle-buffer",
          shrinkToFit: false,
          usage: PIXI.BufferUsage.VERTEX | PIXI.BufferUsage.COPY_DST
        });
        this._dynamicBuffer = new PIXI.Buffer({
          data: new Float32Array(1),
          label: "dynamic-particle-buffer",
          shrinkToFit: false,
          usage: PIXI.BufferUsage.VERTEX | PIXI.BufferUsage.COPY_DST
        });
        for (const i in properties) {
          const property = properties[i];
          const attributeInfo = PIXI.getAttributeInfoFromFormat(property.format);
          if (property.dynamic) {
            geometry.addAttribute(property.attributeName, {
              buffer: this._dynamicBuffer,
              stride: this._dynamicStride * 4,
              offset: dynamicOffset * 4,
              format: property.format
            });
            dynamicOffset += attributeInfo.size;
          } else {
            geometry.addAttribute(property.attributeName, {
              buffer: this._staticBuffer,
              stride: this._staticStride * 4,
              offset: staticOffset * 4,
              format: property.format
            });
            staticOffset += attributeInfo.size;
          }
        }
        geometry.addIndex(this.indexBuffer);
        const uploadFunction = this.getParticleUpdate(properties);
        this._dynamicUpload = uploadFunction.dynamicUpdate;
        this._staticUpload = uploadFunction.staticUpdate;
        this.geometry = geometry;
      }
      getParticleUpdate(properties) {
        const key = getParticleSyncKey(properties);
        if (this._generateParticleUpdateCache[key]) {
          return this._generateParticleUpdateCache[key];
        }
        this._generateParticleUpdateCache[key] = this.generateParticleUpdate(properties);
        return this._generateParticleUpdateCache[key];
      }
      generateParticleUpdate(properties) {
        return generateParticleUpdateFunction(properties);
      }
      update(particles, uploadStatic) {
        if (particles.length > this._size) {
          uploadStatic = true;
          this._size = Math.max(particles.length, this._size * 1.5 | 0);
          this.staticAttributeBuffer = new ViewableBuffer(this._size * this._staticStride * 4 * 4);
          this.dynamicAttributeBuffer = new ViewableBuffer(this._size * this._dynamicStride * 4 * 4);
          this.indexBuffer = createIndicesForQuads(this._size);
          this.geometry.indexBuffer.setDataWithSize(
            this.indexBuffer,
            this.indexBuffer.byteLength,
            true
          );
        }
        const dynamicAttributeBuffer = this.dynamicAttributeBuffer;
        this._dynamicUpload(particles, dynamicAttributeBuffer.float32View, dynamicAttributeBuffer.uint32View);
        this._dynamicBuffer.setDataWithSize(
          this.dynamicAttributeBuffer.float32View,
          particles.length * this._dynamicStride * 4,
          true
        );
        if (uploadStatic) {
          const staticAttributeBuffer = this.staticAttributeBuffer;
          this._staticUpload(particles, staticAttributeBuffer.float32View, staticAttributeBuffer.uint32View);
          this._staticBuffer.setDataWithSize(
            staticAttributeBuffer.float32View,
            particles.length * this._staticStride * 4,
            true
          );
        }
      }
      destroy() {
        this._staticBuffer.destroy();
        this._dynamicBuffer.destroy();
        this.geometry.destroy();
      }
    }
    function getParticleSyncKey(properties) {
      const keyGen = [];
      for (const key in properties) {
        const property = properties[key];
        keyGen.push(key, property.code, property.dynamic ? "d" : "s");
      }
      return keyGen.join("_");
    }

    "use strict";
    const particleUpdateFunctions = {
      aVertex: (ps, f32v, _u32v, offset, stride) => {
        let w0 = 0;
        let w1 = 0;
        let h0 = 0;
        let h1 = 0;
        for (let i = 0; i < ps.length; ++i) {
          const p = ps[i];
          const texture = p.texture;
          const sx = p.scaleX;
          const sy = p.scaleY;
          const ax = p.anchorX;
          const ay = p.anchorY;
          const trim = texture.trim;
          const orig = texture.orig;
          if (trim) {
            w1 = trim.x - ax * orig.width;
            w0 = w1 + trim.width;
            h1 = trim.y - ay * orig.height;
            h0 = h1 + trim.height;
          } else {
            w0 = orig.width * (1 - ax);
            w1 = orig.width * -ax;
            h0 = orig.height * (1 - ay);
            h1 = orig.height * -ay;
          }
          f32v[offset] = w1 * sx;
          f32v[offset + 1] = h1 * sy;
          f32v[offset + stride] = w0 * sx;
          f32v[offset + stride + 1] = h1 * sy;
          f32v[offset + stride * 2] = w0 * sx;
          f32v[offset + stride * 2 + 1] = h0 * sy;
          f32v[offset + stride * 3] = w1 * sx;
          f32v[offset + stride * 3 + 1] = h0 * sy;
          offset += stride * 4;
        }
      },
      aPosition: (ps, f32v, _u32v, offset, stride) => {
        for (let i = 0; i < ps.length; ++i) {
          const p = ps[i];
          const x = p.x;
          const y = p.y;
          f32v[offset] = x;
          f32v[offset + 1] = y;
          f32v[offset + stride] = x;
          f32v[offset + stride + 1] = y;
          f32v[offset + stride * 2] = x;
          f32v[offset + stride * 2 + 1] = y;
          f32v[offset + stride * 3] = x;
          f32v[offset + stride * 3 + 1] = y;
          offset += stride * 4;
        }
      },
      aRotation: (ps, f32v, _u32v, offset, stride) => {
        for (let i = 0; i < ps.length; ++i) {
          const rotation = ps[i].rotation;
          f32v[offset] = rotation;
          f32v[offset + stride] = rotation;
          f32v[offset + stride * 2] = rotation;
          f32v[offset + stride * 3] = rotation;
          offset += stride * 4;
        }
      },
      aUV: (ps, f32v, _u32v, offset, stride) => {
        for (let i = 0; i < ps.length; ++i) {
          const uvs = ps[i].texture.uvs;
          f32v[offset] = uvs.x0;
          f32v[offset + 1] = uvs.y0;
          f32v[offset + stride] = uvs.x1;
          f32v[offset + stride + 1] = uvs.y1;
          f32v[offset + stride * 2] = uvs.x2;
          f32v[offset + stride * 2 + 1] = uvs.y2;
          f32v[offset + stride * 3] = uvs.x3;
          f32v[offset + stride * 3 + 1] = uvs.y3;
          offset += stride * 4;
        }
      },
      aColor: (ps, _f32v, u32v, offset, stride) => {
        for (let i = 0; i < ps.length; ++i) {
          const c = ps[i].color;
          u32v[offset] = c;
          u32v[offset + stride] = c;
          u32v[offset + stride * 2] = c;
          u32v[offset + stride * 3] = c;
          offset += stride * 4;
        }
      }
    };

    "use strict";
    function generateParticleUpdatePolyfill(properties) {
      const dynamicProperties = properties.filter((p) => p.dynamic);
      const staticProperties = properties.filter((p) => !p.dynamic);
      return {
        dynamicUpdate: generateUpdateFunction(dynamicProperties),
        staticUpdate: generateUpdateFunction(staticProperties)
      };
    }
    function generateUpdateFunction(properties) {
      let stride = 0;
      const updateData = [];
      for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        const attributeStride = PIXI.getAttributeInfoFromFormat(property.format).stride / 4;
        stride += attributeStride;
        updateData.push({
          stride: attributeStride,
          updateFunction: property.updateFunction || particleUpdateFunctions[property.attributeName]
        });
      }
      return (ps, f32v, u32v) => {
        let offset = 0;
        for (let i = 0; i < updateData.length; i++) {
          const obx = updateData[i];
          obx.updateFunction(ps, f32v, u32v, offset, stride);
          offset += obx.stride;
        }
      };
    }

    "use strict";




    function generateShaderSyncPolyfill() {
      return syncShader;
    }
    function syncShader(renderer, shader, syncData) {
      const gl = renderer.gl;
      const shaderSystem = renderer.shader;
      const programData = shaderSystem._getProgramData(shader.glProgram);
      for (const i in shader.groups) {
        const bindGroup = shader.groups[i];
        for (const j in bindGroup.resources) {
          const resource = bindGroup.resources[j];
          if (resource instanceof PIXI.UniformGroup) {
            if (resource.ubo) {
              shaderSystem.bindUniformBlock(
                resource,
                shader._uniformBindMap[i][j],
                syncData.blockIndex++
              );
            } else {
              shaderSystem.updateUniformGroup(resource);
            }
          } else if (resource instanceof PIXI.BufferResource) {
            shaderSystem.bindUniformBlock(
              resource,
              shader._uniformBindMap[i][j],
              syncData.blockIndex++
            );
          } else if (resource instanceof PIXI.TextureSource) {
            renderer.texture.bind(resource, syncData.textureCount);
            const uniformName = shader._uniformBindMap[i][j];
            const uniformData = programData.uniformData[uniformName];
            if (uniformData) {
              if (uniformData.value !== syncData.textureCount) {
                gl.uniform1i(uniformData.location, syncData.textureCount);
              }
              syncData.textureCount++;
            }
          } else if (resource instanceof PIXI.TextureStyle) {
          }
        }
      }
    }

    "use strict";
    const uboParserFunctions = [
      (name, data, offset, uv, _v) => {
        const matrix = uv[name].toArray(true);
        data[offset] = matrix[0];
        data[offset + 1] = matrix[1];
        data[offset + 2] = matrix[2];
        data[offset + 4] = matrix[3];
        data[offset + 5] = matrix[4];
        data[offset + 6] = matrix[5];
        data[offset + 8] = matrix[6];
        data[offset + 9] = matrix[7];
        data[offset + 10] = matrix[8];
      },
      (name, data, offset, uv, v) => {
        v = uv[name];
        data[offset] = v.x;
        data[offset + 1] = v.y;
        data[offset + 2] = v.width;
        data[offset + 3] = v.height;
      },
      (name, data, offset, uv, v) => {
        v = uv[name];
        data[offset] = v.x;
        data[offset + 1] = v.y;
      },
      (name, data, offset, uv, v) => {
        v = uv[name];
        data[offset] = v.red;
        data[offset + 1] = v.green;
        data[offset + 2] = v.blue;
        data[offset + 3] = v.alpha;
      },
      (name, data, offset, uv, v) => {
        v = uv[name];
        data[offset] = v.red;
        data[offset + 1] = v.green;
        data[offset + 2] = v.blue;
      }
    ];
    const uboSingleFunctionsWGSL = {
      f32: (_name, data, offset, _uv, v) => {
        data[offset] = v;
      },
      i32: (_name, data, offset, _uv, v) => {
        data[offset] = v;
      },
      "vec2<f32>": (_name, data, offset, _uv, v) => {
        data[offset] = v[0];
        data[offset + 1] = v[1];
      },
      "vec3<f32>": (_name, data, offset, _uv, v) => {
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
      },
      "vec4<f32>": (_name, data, offset, _uv, v) => {
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
        data[offset + 3] = v[3];
      },
      "mat2x2<f32>": (_name, data, offset, _uv, v) => {
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
        data[offset + 3] = v[3];
      },
      "mat3x3<f32>": (_name, data, offset, _uv, v) => {
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
        data[offset + 4] = v[3];
        data[offset + 5] = v[4];
        data[offset + 6] = v[5];
        data[offset + 8] = v[6];
        data[offset + 9] = v[7];
        data[offset + 10] = v[8];
      },
      "mat4x4<f32>": (_name, data, offset, _uv, v) => {
        for (let i = 0; i < 16; i++) {
          data[offset + i] = v[i];
        }
      },
      "mat3x2<f32>": (_name, data, offset, _uv, v) => {
        for (let i = 0; i < 6; i++) {
          data[offset + (i / 3 | 0) * 4 + i % 3] = v[i];
        }
      },
      "mat4x2<f32>": (_name, data, offset, _uv, v) => {
        for (let i = 0; i < 8; i++) {
          data[offset + (i / 4 | 0) * 4 + i % 4] = v[i];
        }
      },
      "mat2x3<f32>": (_name, data, offset, _uv, v) => {
        for (let i = 0; i < 6; i++) {
          data[offset + (i / 2 | 0) * 4 + i % 2] = v[i];
        }
      },
      "mat4x3<f32>": (_name, data, offset, _uv, v) => {
        for (let i = 0; i < 12; i++) {
          data[offset + (i / 4 | 0) * 4 + i % 4] = v[i];
        }
      },
      "mat2x4<f32>": (_name, data, offset, _uv, v) => {
        for (let i = 0; i < 8; i++) {
          data[offset + (i / 2 | 0) * 4 + i % 2] = v[i];
        }
      },
      "mat3x4<f32>": (_name, data, offset, _uv, v) => {
        for (let i = 0; i < 12; i++) {
          data[offset + (i / 3 | 0) * 4 + i % 3] = v[i];
        }
      }
    };
    const uboSingleFunctionsSTD40 = {
      f32: (_name, data, offset, _uv, v) => {
        data[offset] = v;
      },
      i32: (_name, data, offset, _uv, v) => {
        data[offset] = v;
      },
      "vec2<f32>": (_name, data, offset, _uv, v) => {
        data[offset] = v[0];
        data[offset + 1] = v[1];
      },
      "vec3<f32>": (_name, data, offset, _uv, v) => {
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
      },
      "vec4<f32>": (_name, data, offset, _uv, v) => {
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
        data[offset + 3] = v[3];
      },
      "mat2x2<f32>": (_name, data, offset, _uv, v) => {
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 4] = v[2];
        data[offset + 5] = v[3];
      },
      "mat3x3<f32>": (_name, data, offset, _uv, v) => {
        data[offset] = v[0];
        data[offset + 1] = v[1];
        data[offset + 2] = v[2];
        data[offset + 4] = v[3];
        data[offset + 5] = v[4];
        data[offset + 6] = v[5];
        data[offset + 8] = v[6];
        data[offset + 9] = v[7];
        data[offset + 10] = v[8];
      },
      "mat4x4<f32>": (_name, data, offset, _uv, v) => {
        for (let i = 0; i < 16; i++) {
          data[offset + i] = v[i];
        }
      },
      "mat3x2<f32>": (_name, data, offset, _uv, v) => {
        for (let i = 0; i < 6; i++) {
          data[offset + (i / 3 | 0) * 4 + i % 3] = v[i];
        }
      },
      "mat4x2<f32>": (_name, data, offset, _uv, v) => {
        for (let i = 0; i < 8; i++) {
          data[offset + (i / 4 | 0) * 4 + i % 4] = v[i];
        }
      },
      "mat2x3<f32>": (_name, data, offset, _uv, v) => {
        for (let i = 0; i < 6; i++) {
          data[offset + (i / 2 | 0) * 4 + i % 2] = v[i];
        }
      },
      "mat4x3<f32>": (_name, data, offset, _uv, v) => {
        for (let i = 0; i < 12; i++) {
          data[offset + (i / 4 | 0) * 4 + i % 4] = v[i];
        }
      },
      "mat2x4<f32>": (_name, data, offset, _uv, v) => {
        for (let i = 0; i < 8; i++) {
          data[offset + (i / 2 | 0) * 4 + i % 2] = v[i];
        }
      },
      "mat3x4<f32>": (_name, data, offset, _uv, v) => {
        for (let i = 0; i < 12; i++) {
          data[offset + (i / 3 | 0) * 4 + i % 3] = v[i];
        }
      }
    };

    "use strict";
    function generateUboSyncPolyfillSTD40(uboElements) {
      return generateUboSyncPolyfill(
        uboElements,
        uboSingleFunctionsSTD40,
        (uboElement) => {
          const rowSize = Math.max(PIXI.WGSL_TO_STD40_SIZE[uboElement.data.type] / 16, 1);
          const elementSize = uboElement.data.value.length / uboElement.data.size;
          const remainder = (4 - elementSize % 4) % 4;
          return (_name, data, offset, _uv, v) => {
            let t = 0;
            for (let i = 0; i < uboElement.data.size * rowSize; i++) {
              for (let j = 0; j < elementSize; j++) {
                data[offset++] = v[t++];
              }
              offset += remainder;
            }
          };
        }
      );
    }
    function generateUboSyncPolyfillWGSL(uboElements) {
      return generateUboSyncPolyfill(
        uboElements,
        uboSingleFunctionsWGSL,
        (uboElement) => {
          const { size, align } = PIXI.WGSL_ALIGN_SIZE_DATA[uboElement.data.type];
          const remainder = (size - align) / 4;
          return (_name, data, offset, _uv, v) => {
            let t = 0;
            for (let i = 0; i < uboElement.data.size * (size / 4); i++) {
              for (let j = 0; j < size / 4; j++) {
                data[offset++] = v[t++];
              }
              offset += remainder;
            }
          };
        }
      );
    }
    function generateUboSyncPolyfill(uboElements, uboFunctions, arrayUploadFunction) {
      const functionMap = {};
      for (const i in uboElements) {
        const uboElement = uboElements[i];
        const uniform = uboElement.data;
        let parsed = false;
        functionMap[uniform.name] = {
          offset: uboElement.offset / 4,
          func: null
        };
        for (let j = 0; j < PIXI.uniformParsers.length; j++) {
          const parser = PIXI.uniformParsers[j];
          if (uniform.type === parser.type && parser.test(uniform)) {
            functionMap[uniform.name].func = uboParserFunctions[j];
            parsed = true;
            break;
          }
        }
        if (!parsed) {
          if (uniform.size === 1) {
            functionMap[uniform.name].func = uboFunctions[uniform.type];
          } else {
            functionMap[uniform.name].func = arrayUploadFunction(uboElement);
          }
        }
      }
      return (uniforms, data, offset) => {
        for (const i in functionMap) {
          functionMap[i].func(i, data, offset + functionMap[i].offset, uniforms, uniforms[i]);
        }
      };
    }

    "use strict";
    const uniformSingleParserFunctions = {
      f32(name, cu, cv, v, ud, _uv, gl) {
        if (cv !== v) {
          cu.value = v;
          gl.uniform1f(ud[name].location, v);
        }
      },
      "vec2<f32>"(name, _cu, cv, v, ud, _uv, gl) {
        if (cv[0] !== v[0] || cv[1] !== v[1]) {
          cv[0] = v[0];
          cv[1] = v[1];
          gl.uniform2f(ud[name].location, v[0], v[1]);
        }
      },
      "vec3<f32>"(name, _cu, cv, v, ud, _uv, gl) {
        if (cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2]) {
          cv[0] = v[0];
          cv[1] = v[1];
          cv[2] = v[2];
          gl.uniform3f(ud[name].location, v[0], v[1], v[2]);
        }
      },
      "vec4<f32>"(name, _cu, cv, v, ud, _uv, gl) {
        if (cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2] || cv[3] !== v[3]) {
          cv[0] = v[0];
          cv[1] = v[1];
          cv[2] = v[2];
          cv[3] = v[3];
          gl.uniform4f(ud[name].location, v[0], v[1], v[2], v[3]);
        }
      },
      i32(name, cu, cv, v, ud, _uv, gl) {
        if (cv !== v) {
          cu.value = v;
          gl.uniform1i(ud[name].location, v);
        }
      },
      "vec2<i32>"(name, _cu, cv, v, ud, _uv, gl) {
        if (cv[0] !== v[0] || cv[1] !== v[1]) {
          cv[0] = v[0];
          cv[1] = v[1];
          gl.uniform2i(ud[name].location, v[0], v[1]);
        }
      },
      "vec3<i32>"(name, _cu, cv, v, ud, _uv, gl) {
        if (cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2]) {
          cv[0] = v[0];
          cv[1] = v[1];
          cv[2] = v[2];
          gl.uniform3i(ud[name].location, v[0], v[1], v[2]);
        }
      },
      "vec4<i32>"(name, _cu, cv, v, ud, _uv, gl) {
        if (cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2] || cv[3] !== v[3]) {
          cv[0] = v[0];
          cv[1] = v[1];
          cv[2] = v[2];
          cv[3] = v[3];
          gl.uniform4i(ud[name].location, v[0], v[1], v[2], v[3]);
        }
      },
      u32(name, cu, cv, v, ud, _uv, gl) {
        if (cv !== v) {
          cu.value = v;
          gl.uniform1ui(ud[name].location, v);
        }
      },
      "vec2<u32>"(name, _cu, cv, v, ud, _uv, gl) {
        if (cv[0] !== v[0] || cv[1] !== v[1]) {
          cv[0] = v[0];
          cv[1] = v[1];
          gl.uniform2ui(ud[name].location, v[0], v[1]);
        }
      },
      "vec3<u32>"(name, _cu, cv, v, ud, _uv, gl) {
        if (cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2]) {
          cv[0] = v[0];
          cv[1] = v[1];
          cv[2] = v[2];
          gl.uniform3ui(ud[name].location, v[0], v[1], v[2]);
        }
      },
      "vec4<u32>"(name, _cu, cv, v, ud, _uv, gl) {
        if (cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2] || cv[3] !== v[3]) {
          cv[0] = v[0];
          cv[1] = v[1];
          cv[2] = v[2];
          cv[3] = v[3];
          gl.uniform4ui(ud[name].location, v[0], v[1], v[2], v[3]);
        }
      },
      bool(name, cu, cv, v, ud, _uv, gl) {
        if (cv !== v) {
          cu.value = v;
          gl.uniform1i(ud[name].location, v);
        }
      },
      "vec2<bool>"(name, _cu, cv, v, ud, _uv, gl) {
        if (cv[0] !== v[0] || cv[1] !== v[1]) {
          cv[0] = v[0];
          cv[1] = v[1];
          gl.uniform2i(ud[name].location, v[0], v[1]);
        }
      },
      "vec3<bool>"(name, _cu, cv, v, ud, _uv, gl) {
        if (cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2]) {
          cv[0] = v[0];
          cv[1] = v[1];
          cv[2] = v[2];
          gl.uniform3i(ud[name].location, v[0], v[1], v[2]);
        }
      },
      "vec4<bool>"(name, _cu, cv, v, ud, _uv, gl) {
        if (cv[0] !== v[0] || cv[1] !== v[1] || cv[2] !== v[2] || cv[3] !== v[3]) {
          cv[0] = v[0];
          cv[1] = v[1];
          cv[2] = v[2];
          cv[3] = v[3];
          gl.uniform4i(ud[name].location, v[0], v[1], v[2], v[3]);
        }
      },
      "mat2x2<f32>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniformMatrix2fv(ud[name].location, false, v);
      },
      "mat3x3<f32>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniformMatrix3fv(ud[name].location, false, v);
      },
      "mat4x4<f32>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniformMatrix4fv(ud[name].location, false, v);
      }
    };
    const uniformArrayParserFunctions = {
      f32(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniform1fv(ud[name].location, v);
      },
      "vec2<f32>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniform2fv(ud[name].location, v);
      },
      "vec3<f32>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniform3fv(ud[name].location, v);
      },
      "vec4<f32>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniform4fv(ud[name].location, v);
      },
      "mat2x2<f32>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniformMatrix2fv(ud[name].location, false, v);
      },
      "mat3x3<f32>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniformMatrix3fv(ud[name].location, false, v);
      },
      "mat4x4<f32>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniformMatrix4fv(ud[name].location, false, v);
      },
      i32(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniform1iv(ud[name].location, v);
      },
      "vec2<i32>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniform2iv(ud[name].location, v);
      },
      "vec3<i32>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniform3iv(ud[name].location, v);
      },
      "vec4<i32>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniform4iv(ud[name].location, v);
      },
      u32(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniform1iv(ud[name].location, v);
      },
      "vec2<u32>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniform2iv(ud[name].location, v);
      },
      "vec3<u32>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniform3iv(ud[name].location, v);
      },
      "vec4<u32>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniform4iv(ud[name].location, v);
      },
      bool(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniform1iv(ud[name].location, v);
      },
      "vec2<bool>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniform2iv(ud[name].location, v);
      },
      "vec3<bool>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniform3iv(ud[name].location, v);
      },
      "vec4<bool>"(name, _cu, _cv, v, ud, _uv, gl) {
        gl.uniform4iv(ud[name].location, v);
      }
    };
    const uniformParserFunctions = [
      (name, _cu, _cv, _v, ud, uv, gl) => {
        gl.uniformMatrix3fv(ud[name].location, false, uv[name].toArray(true));
      },
      (name, _cu, cv, v, ud, uv, gl) => {
        cv = ud[name].value;
        v = uv[name];
        if (cv[0] !== v.x || cv[1] !== v.y || cv[2] !== v.width || cv[3] !== v.height) {
          cv[0] = v.x;
          cv[1] = v.y;
          cv[2] = v.width;
          cv[3] = v.height;
          gl.uniform4f(ud[name].location, v.x, v.y, v.width, v.height);
        }
      },
      (name, _cu, cv, v, ud, uv, gl) => {
        cv = ud[name].value;
        v = uv[name];
        if (cv[0] !== v.x || cv[1] !== v.y) {
          cv[0] = v.x;
          cv[1] = v.y;
          gl.uniform2f(ud[name].location, v.x, v.y);
        }
      },
      (name, _cu, cv, v, ud, uv, gl) => {
        cv = ud[name].value;
        v = uv[name];
        if (cv[0] !== v.red || cv[1] !== v.green || cv[2] !== v.blue || cv[3] !== v.alpha) {
          cv[0] = v.red;
          cv[1] = v.green;
          cv[2] = v.blue;
          cv[3] = v.alpha;
          gl.uniform4f(ud[name].location, v.red, v.green, v.blue, v.alpha);
        }
      },
      (name, _cu, cv, v, ud, uv, gl) => {
        cv = ud[name].value;
        v = uv[name];
        if (cv[0] !== v.red || cv[1] !== v.green || cv[2] !== v.blue) {
          cv[0] = v.red;
          cv[1] = v.green;
          cv[2] = v.blue;
          gl.uniform3f(ud[name].location, v.red, v.green, v.blue);
        }
      }
    ];

    "use strict";
    function generateUniformsSyncPolyfill(group, uniformData) {
      const functionMap = {};
      for (const i in group.uniformStructures) {
        if (!uniformData[i])
          continue;
        const uniform = group.uniformStructures[i];
        let parsed = false;
        for (let j = 0; j < PIXI.uniformParsers.length; j++) {
          const parser = PIXI.uniformParsers[j];
          if (uniform.type === parser.type && parser.test(uniform)) {
            functionMap[i] = uniformParserFunctions[j];
            parsed = true;
            break;
          }
        }
        if (!parsed) {
          const templateType = uniform.size === 1 ? uniformSingleParserFunctions : uniformArrayParserFunctions;
          functionMap[i] = templateType[uniform.type];
        }
      }
      return (ud, uv, renderer) => {
        const gl = renderer.gl;
        for (const i in functionMap) {
          const v = uv[i];
          const cu = ud[i];
          const cv = ud[i].value;
          functionMap[i](i, cu, cv, v, ud, uv, gl);
        }
      };
    }

    "use strict";
    function selfInstall() {
      Object.assign(PIXI.AbstractRenderer.prototype, {
        // override unsafeEval check, as we don't need to use it
        _unsafeEvalCheck() {
        }
      });
      Object.assign(PIXI.UboSystem.prototype, {
        // override unsafeEval check, as we don't need to use it
        _systemCheck() {
        }
      });
      Object.assign(PIXI.GlUniformGroupSystem.prototype, {
        // use polyfill which avoids eval method
        _generateUniformsSync: generateUniformsSyncPolyfill
      });
      Object.assign(PIXI.GlUboSystem.prototype, {
        // use polyfill which avoids eval method
        _generateUboSync: generateUboSyncPolyfillSTD40
      });
      Object.assign(PIXI.GpuUboSystem.prototype, {
        // use polyfill which avoids eval method
        _generateUboSync: generateUboSyncPolyfillWGSL
      });
      Object.assign(PIXI.GlShaderSystem.prototype, {
        // use polyfill which avoids eval method
        _generateShaderSync: generateShaderSyncPolyfill
      });
      Object.assign(ParticleBuffer.prototype, {
        // use polyfill which avoids eval method
        generateParticleUpdate: generateParticleUpdatePolyfill
      });
    }
    selfInstall();

    "use strict";

    "use strict";

    exports.generateParticleUpdatePolyfill = generateParticleUpdatePolyfill;
    exports.generateShaderSyncPolyfill = generateShaderSyncPolyfill;
    exports.generateUboSyncPolyfillSTD40 = generateUboSyncPolyfillSTD40;
    exports.generateUboSyncPolyfillWGSL = generateUboSyncPolyfillWGSL;
    exports.generateUniformsSyncPolyfill = generateUniformsSyncPolyfill;
    exports.particleUpdateFunctions = particleUpdateFunctions;
    exports.uboParserFunctions = uboParserFunctions;
    exports.uboSingleFunctionsSTD40 = uboSingleFunctionsSTD40;
    exports.uboSingleFunctionsWGSL = uboSingleFunctionsWGSL;
    exports.uniformArrayParserFunctions = uniformArrayParserFunctions;
    exports.uniformParserFunctions = uniformParserFunctions;
    exports.uniformSingleParserFunctions = uniformSingleParserFunctions;

    return exports;

})({});
Object.assign(this.PIXI, unsafe_eval_js);


}).call({PIXI});
// Pixi 8.6.6 calls UBO sync with four arguments; the static vendor closure accepts three.
const generateStaticUbo=PIXI.GlUboSystem.prototype._generateUboSync;
PIXI.GlUboSystem.prototype._generateUboSync=function(elements){
 const isInteger=element=>/i32/.test(element.data.type),integerElements=elements.filter(isInteger),syncFloat=generateStaticUbo.call(this,elements.filter(element=>!isInteger(element)));
 return function(values,data,dataInt32,offset=0){
  syncFloat(values,data,offset);
  const signed=dataInt32||new Int32Array(data.buffer,data.byteOffset,data.length);
  for(const element of integerElements){const uniform=element.data,value=values[uniform.name],components=Number(uniform.type.match(/vec([234])/)?.[1]||1),array=uniform.size>1,target=signed,stride=array?4:components,base=offset+element.offset/4;for(let i=0;i<uniform.size;i++)for(let c=0;c<components;c++)target[base+i*stride+c]=components===1&&!array?value:value[i*components+c];}
 };
};
// The distribution bundles a private ParticleBuffer class; attach the exported static function to the actual renderer class.
PIXI.ParticleBuffer.prototype.generateParticleUpdate=PIXI.generateParticleUpdatePolyfill;
PIXI.no2CspCompat='8.6.6';return true;}
function embed(html){const patch='('+install.toString()+')(globalThis.PIXI);';let inserted=false;const result=html.replace(/<\/script\s*>/i,tag=>{inserted=true;return tag+'<scr'+'ipt>'+patch+'</scr'+'ipt>'});if(!inserted)return html;return result;}
g.No2PixiCsp={install,embed};if(g.PIXI)install(g.PIXI);
})(globalThis);

'use strict';
(function(g){
function resizePixels(input){
 const {pixels,sw,sh,width,height}=input,linear=new Float32Array(256),srgb=new Uint8Array(65536);
 for(let i=0;i<256;i++){const x=i/255;linear[i]=x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)}
 for(let i=0;i<65536;i++){const x=i/65535;srgb[i]=Math.round(255*(x<=.0031308?12.92*x:1.055*Math.pow(x,1/2.4)-.055))}
 const sinc=x=>Math.abs(x)<1e-9?1:Math.sin(Math.PI*x)/(Math.PI*x);
 const kernel=(source,dest)=>Array.from({length:dest},(_,x)=>{const factor=Math.max(1,source/dest),center=(x+.5)*source/dest-.5,lo=Math.ceil(center-3*factor),hi=Math.floor(center+3*factor),indices=[],weights=[];let sum=0;for(let at=lo;at<=hi;at++){const d=(at-center)/factor,w=Math.abs(d)>=3?0:sinc(d)*sinc(d/3);indices.push(Math.max(0,Math.min(source-1,at)));weights.push(w);sum+=w}return{indices,weights:weights.map(w=>w/sum)}});
 const kx=kernel(sw,width),ky=kernel(sh,height),temp=new Float32Array(width*sh*4),output=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<sh;y++)for(let x=0;x<width;x++){const k=kx[x],to=(y*width+x)*4;let r=0,gg=0,b=0,a=0;for(let j=0;j<k.indices.length;j++){const from=(y*sw+k.indices[j])*4,alpha=pixels[from+3]/255,w=k.weights[j];r+=linear[pixels[from]]*alpha*w;gg+=linear[pixels[from+1]]*alpha*w;b+=linear[pixels[from+2]]*alpha*w;a+=alpha*w}temp[to]=r;temp[to+1]=gg;temp[to+2]=b;temp[to+3]=a}
 const channel=(v,a)=>srgb[Math.round(Math.max(0,Math.min(1,v/a))*65535)];
 for(let y=0;y<height;y++){const k=ky[y];for(let x=0;x<width;x++){const to=(y*width+x)*4;let r=0,gg=0,b=0,a=0;for(let j=0;j<k.indices.length;j++){const from=(k.indices[j]*width+x)*4,w=k.weights[j];r+=temp[from]*w;gg+=temp[from+1]*w;b+=temp[from+2]*w;a+=temp[from+3]*w}if(a<.002)continue;output[to]=channel(r,a);output[to+1]=channel(gg,a);output[to+2]=channel(b,a);output[to+3]=Math.round(Math.max(0,Math.min(1,a))*255)}}
 return output;
}
let pool=null;const buffers=new Map();
function createPool(){
 const state={workers:[],queue:[],broken:false};
 if(typeof Worker==='undefined'){state.broken=true;return state}
 const source='const resizePixels='+resizePixels.toString()+';onmessage=e=>{try{const pixels=resizePixels(e.data);postMessage({pixels},[pixels.buffer])}catch(e){postMessage({error:e.message})}}';
 const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
 for(let i=0;i<2;i++){try{const worker=new Worker(url),slot={worker,job:null};worker.onmessage=e=>{const job=slot.job;slot.job=null;if(e.data.error)job.reject(Error(e.data.error));else job.resolve(e.data.pixels);dispatch(state)};worker.onerror=()=>{state.broken=true;for(const s of state.workers){s.job?.reject(Error('Raster worker unavailable'));s.job=null;s.worker.terminate()}for(const j of state.queue)j.reject(Error('Raster worker unavailable'));state.queue=[]};state.workers.push(slot)}catch(e){state.broken=true;for(const s of state.workers)s.worker.terminate();break}}
 setTimeout(()=>URL.revokeObjectURL(url),10000);return state;
}
function dispatch(state){if(state.broken)return;for(const slot of state.workers)if(!slot.job&&state.queue.length){slot.job=state.queue.shift();slot.worker.postMessage(slot.job.input,[slot.job.input.pixels.buffer])}}
function work(input){pool??=createPool();if(pool.broken)return Promise.resolve(resizePixels(input));return new Promise((resolve,reject)=>{pool.queue.push({input,resolve,reject});dispatch(pool)})}
async function reconstruct(image,asset,data){
 const recipe=data.reconstruction?.recipes?.[asset.id];if(!recipe)return image;
 const input=document.createElement('canvas');input.width=image.width;input.height=image.height;const context=input.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
 let pixels;const request=()=>({pixels:context.getImageData(0,0,input.width,input.height).data,sw:input.width,sh:input.height,width:recipe.width,height:recipe.height});
 try{pixels=await work(request())}catch(e){pixels=resizePixels(request())}
 const output=document.createElement('canvas');output.width=recipe.width;output.height=recipe.height;output.getContext('2d').putImageData(new ImageData(pixels,recipe.width,recipe.height),0,0);input.width=input.height=1;
 output.no2Reconstruction={sourceWidth:asset.width,sourceHeight:asset.height,width:recipe.width,height:recipe.height};return output;
}
function retain(image){if(image.no2Reconstruction)buffers.set(image,image.width*image.height*4)}
function release(image){if(!image?.no2Reconstruction)return;buffers.delete(image);image.width=image.height=1}
function stats(){return{activeReconstructionBuffers:buffers.size,reconstructedBufferPixelBytes:[...buffers.values()].reduce((a,b)=>a+b,0),note:'Reconstruction render buffers, in addition to decoded native source-pixel accounting. Excludes GPU copies, mipmaps and driver allocations.'}}
g.No2Raster={resizePixels,reconstruct,retain,release,stats};
})(globalThis);


'use strict';
(function(g){
class AssetService{
 constructor(data){this.data=data;this.loaded=new Map();this.released=[];this.generation=0}
 descriptor(id){const a=this.data.assets.find(a=>a.id===id);if(!a)throw Error('Unknown asset '+id);return a}
 uri(id){const a=this.descriptor(id);return this.data.files[a.file]}
 async get(id){if(this.loaded.has(id))return this.loaded.get(id);const a=this.descriptor(id);
  // A composed asset (a translated comic page: the clean page and that language's letters, owner 2026-10-30) is drawn
  // together once from its parts, which are released again.
  if(a.compose){const parts=await Promise.all(a.compose.map(c=>this.get(c))),c=document.createElement('canvas');c.width=a.width;c.height=a.height;const q=c.getContext('2d');for(const p of parts)q.drawImage(p.image,0,0,a.width,a.height);for(const p of a.compose)this.release(p);No2Raster.retain(c);
   const record={...a,image:c,texture:new PIXI.Texture({source:new PIXI.ImageSource({resource:c,alphaMode:'premultiply-alpha-on-upload',autoGenerateMipmaps:true,minFilter:'linear',magFilter:'linear',mipmapFilter:'linear'})})};this.loaded.set(id,record);return record}
  const generation=this.generation,image=new Image();image.src=this.uri(id);await image.decode();if(a.group!=='hub'&&generation!==this.generation){image.src='';throw Error('Notebook opening cancelled.')}const raster=await No2Raster.reconstruct(image,a,this.data);if(a.group!=='hub'&&generation!==this.generation){No2Raster.release(raster);image.src='';throw Error('Notebook opening cancelled.')}if(raster!==image)image.src='';No2Raster.retain(raster);const record={...a,image:raster,texture:new PIXI.Texture({source:new PIXI.ImageSource({resource:raster,alphaMode:'premultiply-alpha-on-upload',autoGenerateMipmaps:true,minFilter:'linear',magFilter:'linear',mipmapFilter:'linear'})})};this.loaded.set(id,record);return record}
 async group(group){return Promise.all(this.data.assets.filter(a=>a.group===group).map(a=>this.get(a.id)))}
 release(id){const a=this.loaded.get(id);if(a){a.texture.destroy(true);No2Raster.release(a.image);a.image.src='';this.loaded.delete(id)}}
 releaseNotebook(){this.generation++;let bytes=0;for(const[id,a]of [...this.loaded])if(a.group!=='hub'){bytes+=a.width*a.height*4;a.texture.destroy(true);No2Raster.release(a.image);a.image.src='';this.loaded.delete(id)}this.released.push(bytes);return bytes}
 stats(){const values=[...this.loaded.values()];return{...No2Raster.stats(),loaded:values.map(x=>x.id),hubPixelBytes:values.filter(x=>x.group==='hub').reduce((s,x)=>s+x.width*x.height*4,0),notebookPixelBytes:values.filter(x=>x.group!=='hub').reduce((s,x)=>s+x.width*x.height*4,0),releasedPixelBytes:this.released.reduce((a,b)=>a+b,0),note:'Logical decoded source pixels; excludes driver allocations and post-processing buffers.'}}
}
class AudioBus{
constructor(save){this.save=save;this.children=new Set();this.context=null;this.cueId=null;this.nextNote=0;this.noteIndex=0;this.duckUntil=0;this.comicOn=false;this.assets=globalThis.No2AssetData?.audio||{};this.tracks=globalThis.No2Audio||{music:{},sfx:{}};this.buffers=new Map();this.loading=new Map();this.song=null;this.songId=null;this.level=.5}
unlock(){try{this.context??=new AudioContext();this.master??=this.context.createGain();if(!this.connected){/* A limiter after everything (audio review 2026-10-29): sounds that overlap never clip into crackle. */const l=this.context.createDynamicsCompressor();l.threshold.value=-2;l.knee.value=0;l.ratio.value=20;l.attack.value=.002;l.release.value=.12;this.master.connect(l).connect(this.context.destination);this.limiter=l;this.connected=true}this.context.resume();this.apply();if(!this.preloaded){this.preloaded=true;for(const id in this.tracks.sfx)this.load('sfx',id);document.addEventListener('visibilitychange',()=>{if(document.hidden)this.context.suspend();else this.context.resume()})}}catch{}}
// Approved recorded audio (owner 2026-10-27): Lyria music and ElevenLabs effects, AAC data URIs decoded with Web Audio
// (no media element, no network). Effects are decoded once; at most three music tracks stay decoded.
load(kind,id){const key=kind+':'+id;if(this.buffers.has(key))return Promise.resolve(this.buffers.get(key));if(this.loading.has(key))return this.loading.get(key);const g0=kind==='game'?this.tracks.games?.[id.split('/')[0]]?.[id.split('/')[1]]:null,src=kind==='sfx'?this.tracks.sfx[id]:kind==='game'?(g0?.src||g0):kind==='tape'?this.tracks.mixtapes?.[id.split('/')[0]]?.[id.split('/')[1]]?.src:kind==='voice'?this.tracks.narration?.[id]?.src:this.tracks.music[id]?.src;if(!src||!this.context)return Promise.resolve(null);const bin=atob(src.slice(src.indexOf(',')+1)),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);const p=this.context.decodeAudioData(bytes.buffer).then(b=>{this.loading.delete(key);this.buffers.set(key,b);if(kind==='music'){const old=[...this.buffers.keys()].filter(k=>k.startsWith('music:')&&k!=='music:'+this.songId);while(old.length>2)this.buffers.delete(old.shift())}if(kind==='tape'){const old=[...this.buffers.keys()].filter(k=>k.startsWith('tape:'));while(old.length>3)this.buffers.delete(old.shift())}return b},()=>{this.loading.delete(key);return null});this.loading.set(key,p);return p}
sample(id,volume=.5,rate=1,key='sfx:'+id){const b=this.buffers.get(key);if(!b||!this.master)return false;const c=this.context,s=c.createBufferSource(),a=c.createGain();s.buffer=b;s.playbackRate.value=rate;a.gain.value=volume;s.connect(a).connect(this.master);s.start();return true}
// Game sounds (owner 2026-10-27, style A: arcade cabinet): each notebook's recorded effects, decoded when it opens. A game
// asks gameSample first and falls back to its own synthesis when there is no recording (the invaders' march, the rocks'
// heartbeat). A few events vary their pitch like the cabinets did.
loadGame(id){const evs=this.tracks.games?.[id];if(!evs||!this.context)return;for(const ev in evs)this.load('game',id+'/'+ev)}
gameSample(id,e){if(!this.save.settings.sound||!this.context)return false;const evs=this.tracks.games?.[id];if(!evs)return false;let t=e.type;if(id==='detention-breakout'&&(t==='side'||t==='top'))t='wall';if(!evs[t]||typeof evs[t]==='object')return false;
 const rate=id==='detention-breakout'&&t==='brick'?1+(7-(e.row||0))*.04:id==='erasteroids'&&t==='explode'&&!e.saucer?({1:1.3,2:1.1,3:.9}[e.size]||1):id==='snack-man'&&t==='dot'?((this.wakka=!this.wakka)?.92:1.08):1;
 return this.sample(t,.35,rate,'game:'+id+'/'+t)}
// A game's repeating voices (sirens, walking tunes, heartbeats, hums): one ElevenLabs note per voice, replayed at the
// length the game asks for. The recording is taken as the note its prompt asked for (f0), or else as the first note the
// game asks for, and the game's notes move from there (the march's four steps, a siren rising); without a recording the old tone plays.
voice(id,name){const v=this.tracks.games?.[id]?.[name],b=v&&this.buffers.get('game:'+id+'/'+name);return b&&this.master&&this.save.settings.sound?{v,b}:null}
gameTone(id,name,freq,duration=.2,volume=.05,type='triangle',delay=0){const s=this.voice(id,name);if(!s)return this.tone(freq,duration,volume,type,delay);const c=this.context,t=c.currentTime+delay,src=c.createBufferSource(),a=c.createGain();
 const ref=s.v.f0||((this.voiceRef??={})[id+'/'+name]??=freq);src.buffer=s.b;src.playbackRate.value=Math.max(.25,Math.min(4,freq/ref));const peak=Math.min(.6,volume*14);a.gain.setValueAtTime(peak,t);a.gain.setValueAtTime(peak,t+duration*.7);a.gain.exponentialRampToValueAtTime(.0001,t+duration+.04);src.connect(a).connect(this.master);src.start(t);src.stop(t+duration+.06)}
gameNoise(id,name,duration=.12,frequency=1500,volume=.04){const s=this.voice(id,name);if(!s)return this.noise(duration,frequency,volume);const c=this.context,t=c.currentTime,src=c.createBufferSource(),a=c.createGain();
 src.buffer=s.b;const peak=Math.min(.6,volume*10);a.gain.setValueAtTime(peak,t);a.gain.exponentialRampToValueAtTime(.0001,t+duration+.04);src.connect(a).connect(this.master);src.start(t);src.stop(t+duration+.06)}
// A held sound (thrust): the voice loops seamlessly while on. Returns false without a recording, so the caller keeps its own.
gameLoop(id,name,on,volume=.3){const key=id+'/'+name,cur=(this.loops??={})[key];if(!on){if(cur){const t=this.context.currentTime;cur.a.gain.setTargetAtTime(0,t,.05);cur.src.stop(t+.3);delete this.loops[key]}return!!this.voice(id,name)}
 if(cur)return true;const s=this.voice(id,name);if(!s)return false;const c=this.context,src=c.createBufferSource(),a=c.createGain();src.buffer=s.b;src.loop=true;a.gain.value=0;a.gain.setTargetAtTime(volume,c.currentTime,.05);src.connect(a).connect(this.master);src.start();this.loops[key]={src,a};return true}
// Music: one looping track at a time. Each pass crossfades its last XF seconds into the next pass from the start.
music(id,level=.5){this.level=level;const tape=typeof id==='string'&&id.startsWith('tape:')?id.slice(5):null;if(tape?!this.tracks.mixtapes?.[tape]:!this.tracks.music[id])id=null;if(id===this.songId||!this.context||!this.master)return;const c=this.context,t=c.currentTime,old=this.song;if(old?.tape&&old.started!=null&&Number.isFinite(old.next))(this.tapeOff??={})[old.tape]=Math.max(0,t-old.started);if(old){old.out.gain.cancelScheduledValues(t);old.out.gain.setTargetAtTime(0,t,.25);setTimeout(()=>{old.sources.forEach(x=>{try{x.stop()}catch{}});try{old.out.disconnect()}catch{}},2000)}this.song=null;this.songId=id;if(!id)return;if(tape){const out=c.createGain();out.gain.value=0;out.connect(this.master);out.gain.setTargetAtTime(this.level,c.currentTime,.3);this.song={id,tape,out,sources:[],next:Infinity,idx:(this.tapeAt??={})[tape]||0};this.tapeSong(c.currentTime+.05);return}this.load('music',id).then(buf=>{if(!buf||this.songId!==id||this.song)return;const out=c.createGain();out.gain.value=0;out.connect(this.master);out.gain.setTargetAtTime(this.level,c.currentTime,.3);this.song={id,buf,out,sources:[],next:0};this.pass(c.currentTime+.05,false)})}
pass(at,fade){const XF=2,c=this.context,song=this.song,d=song.buf.duration,s=c.createBufferSource(),g=c.createGain();s.buffer=song.buf;s.connect(g).connect(song.out);g.gain.setValueAtTime(fade?0:1,at);if(fade)g.gain.linearRampToValueAtTime(1,at+XF);g.gain.setValueAtTime(1,at+d-XF);g.gain.linearRampToValueAtTime(0,at+d);s.start(at);s.stop(at+d+.05);song.sources=[...song.sources.slice(-1),s];song.next=at+d-XF}
// Walkman mixtapes (owner 2026-10-29): a tape's songs play whole, in order, with a short gap, and the tape loops; the next
// song is decoded while one plays, and each tape remembers the song it was on.
tapeSong(at){const song=this.song,c=this.context,n=this.tracks.mixtapes[song.tape].length,i=song.idx%n;song.next=Infinity;this.load('tape',song.tape+'/'+i).then(buf=>{if(this.song!==song||!buf)return;const s=c.createBufferSource();s.buffer=buf;s.connect(song.out);const t0=Math.max(at,c.currentTime+.02),off=Math.min(buf.duration-1,(this.tapeOff??={})[song.tape]||0);delete this.tapeOff[song.tape];s.start(t0,Math.max(0,off));song.started=t0-off;song.sources=[...song.sources.slice(-1),s];song.next=t0+buf.duration-off+.8;this.tapeAt[song.tape]=i;if(off<1)try{this.onTapeSong?.(song.tape,i,Math.max(0,t0-c.currentTime))}catch{}/* a song resumed mid-way (after a game or a pause) is not announced again */this.load('tape',song.tape+'/'+((i+1)%n))})}
// One song of a tape chosen from its case card (owner 2026-10-30): it starts now, or is where the tape starts when it plays.
playSong(tape,i){const song=this.song,n=this.tracks.mixtapes?.[tape]?.length||3;i=((i%n)+n)%n;delete(this.tapeOff??={})[tape];if(!song?.tape||song.tape!==tape){(this.tapeAt??={})[tape]=i;return}song.sources.forEach(x=>{try{x.stop()}catch{}});song.idx+=((i-song.idx%n)+n)%n;this.tapeSong(this.context.currentTime+.15)}
nextSong(tape){const song=this.song;if(!song?.tape||(tape&&song.tape!==tape)){if(tape){const n=this.tracks.mixtapes?.[tape]?.length||3;(this.tapeAt??={})[tape]=(((this.tapeAt[tape]||0)+1)%n);delete(this.tapeOff??={})[tape]}return}delete(this.tapeOff??={})[song.tape];song.sources.forEach(x=>{try{x.stop()}catch{}});song.idx++;this.tapeSong(this.context.currentTime+.15)}
tone(freq,duration=.2,volume=.05,type='triangle',delay=0,music=false){if(!this.context||!this.master)return;const c=this.context,t=c.currentTime+delay,o=c.createOscillator(),a=c.createGain();o.type=type;o.frequency.value=freq;a.gain.setValueAtTime(.0001,t);a.gain.linearRampToValueAtTime(volume,t+.008);a.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(a).connect(music?(this.musicBus||this.master):this.master);o.start(t);o.stop(t+duration+.01)}
noise(duration=.12,frequency=1500,volume=.04,seed=29){if(!this.context)return;const c=this.context,b=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;d[i]=(seed/2147483648-1)*Math.pow(1-i/d.length,1.5)}const s=c.createBufferSource(),f=c.createBiquadFilter(),a=c.createGain();s.buffer=b;f.type='bandpass';f.frequency.value=frequency;f.Q.value=.7;a.gain.value=volume;s.connect(f).connect(a).connect(this.master);s.start();s.stop(c.currentTime+duration)}
// Moving between things in the locker: a short soft paper tick (the recorded pen scribble is a full second, too much
// for every move; owner 2026-10-27).
hover(){if(!this.save.settings.sound)return;this.unlock();if(this.context)this.noise(.07,2100,.03)}
click(material='paper'){this.unlock();this.foley(material==='plastic'?'plastic':'tap')}
foley(id){if(!this.save.settings.sound)return;this.unlock();if(!this.context)return;const t=this.context.currentTime;this.duckUntil=t+(id==='slam'||id==='bell'?1:.35);if(this.sample(id))return;if(['coin','jar'].includes(id)){[1,1.41,2.09,2.76].forEach((r,i)=>this.tone(1150*r,.35-i*.04,.035/(i+1),'sine',i*.008))}else if(id==='bell'){[1,2.71,4.1].forEach((r,i)=>this.tone(520*r,.7,.04/(i+1),'sine'))}else if(id==='slam'){this.tone(95,.15,.1,'triangle');this.noise(.15,1900,.09)}else if(id==='growl'){this.tone(62,.3,.055,'sawtooth')}else if(id==='gameover'){[440,392,330,220].forEach((f,i)=>this.tone(f,.25,.035,'triangle',i*.13))}else if(id==='success'){[293.665,349.23,440,659.25].forEach((f,i)=>this.tone(f,.2,.03,'square',i*.075))}else if(id==='bike'){this.noise(.25,550,.022);this.tone(190,.02,.018,'triangle')}else if(id==='murmur'){this.noise(.4,390,.025,42)}else if(id==='chalk'){this.noise(.22,2800,.04)}else if(id==='plastic'){this.tone(360,.045,.04,'triangle');this.noise(.025,700,.02)}else this.noise(id==='page'?.22:.07,id==='scratch'?2100:1100,.03)}
// Comic narration (owner 2026-10-29): her voice, one recording per page, started when the page shows and cut short with
// a quick fade when the page turns or the comic ends; the music sits low under it. Off with "comic narration" in settings.
narrate(page){const c=this.context,cur=this.voiceNow;if(cur&&c){const t=c.currentTime;cur.a.gain.setTargetAtTime(0,t,.08);try{cur.s.stop(t+.4)}catch{}this.voiceNow=null;this.voiceUntil=0}
 // Each language's own recording when there is one (owner 2026-10-30, languages: 'fr:3'), else the English.
 const lk=(globalThis.No2I18n?.lang||'en')!=='en'&&page&&this.tracks.narration?.[globalThis.No2I18n.lang+':'+page]?globalThis.No2I18n.lang+':'+page:page,tr=page&&this.tracks.narration?.[lk];if(!tr||!c||!this.master||this.save.settings.narration===false||!this.save.settings.sound)return;const want=page;this.voicePage=page;
 this.load('voice',String(lk)).then(b=>{if(!b||this.voicePage!==want||this.voiceNow)return;const s=c.createBufferSource(),a=c.createGain(),t=c.currentTime+.35;s.buffer=b;a.gain.value=.95;s.connect(a).connect(this.master);s.start(t);this.voiceNow={s,a};this.voiceUntil=t+b.duration+.3;s.onended=()=>{if(this.voiceNow?.s===s)this.voiceNow=null}})}
cue(id){this.cueId=id}
beginComic(){this.comicOn=true}
panel(id){const f={1:'coin',3:'chalk',4:'scratch',5:'scratch',6:'tap',7:'slam',9:'bell',10:'murmur',11:'page',12:'murmur',13:'coin',14:'jar',15:'scratch',16:'bike',17:'coin',18:'plastic',19:'murmur',20:'murmur',21:'plastic',22:'success',23:'coin',24:'gameover',25:'bike',26:'scratch',27:'page',28:'page',29:'scratch',30:'scratch'};this.foley(f[id]||'tap');if(id===13)setTimeout(()=>this.foley('growl'),200)}
endComic(){this.comicOn=false;this.narrate(null)}
update(dt){const c=this.context,song=this.song;if(!c||!song)return;const t=c.currentTime;if(song.tape){if(t>song.next-.3){song.idx++;this.tapeSong(song.next)}}else if(t>song.next-1)this.pass(song.next,true);song.out.gain.setTargetAtTime(this.level*(t<(this.voiceUntil||0)?.3:t<this.duckUntil?.55:1),t,.12)}
comic(page){this.panel(page+1)}
attach(audio){const original=audio.configure.bind(audio),save=this.save;audio.configure=function(options={}){const sound=options.sound??this.enabled,volume=options.volume??this.volume,mouth=options.mouth??this.mouth;original({sound:sound&&save.settings.sound,volume:volume*save.settings.masterVolume,mouth});this.enabled=sound;this.volume=volume;this.mouth=mouth};this.children.add(audio);audio.configure();return()=>this.children.delete(audio)}
apply(){if(this.master&&this.context)this.master.gain.setTargetAtTime(this.save.settings.sound?this.save.settings.masterVolume:0,this.context.currentTime,.025);for(const c of this.children)c.configure()}
}

g.No2Render={AssetService,AudioBus};
})(globalThis);



