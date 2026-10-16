import assert from 'node:assert/strict';
import {createEndingFilm} from './ending-player.mjs';
// Minimal media/DOM boundary: execute the real lifecycle without real downloads.
let mounted, failPlay=false;
class Element {
  hidden=false; children=[]; inert=false; isConnected=true; value=''; tagName='DIV';
  style={}; listeners=new Map(); nodes=new Map();
  setAttribute(){} removeAttribute(){} load(){}
  querySelector(selector){if(!this.nodes.has(selector)) this.nodes.set(selector,selector==='video'?new Media():new Element());return this.nodes.get(selector);}
  querySelectorAll(){return [];}
  append(node){this.children.push(node);mounted=node;}
  addEventListener(k,f){this.listeners.set(k,f);} removeEventListener(k){this.listeners.delete(k);}
  focus(){} contains(){return false;} remove(){this.isConnected=false;}
}
class Media extends Element {
  paused=true;
  play(){if(failPlay)return Promise.reject(new DOMException('blocked','NotAllowedError'));this.paused=false;this.onplay?.();return Promise.resolve();}
  pause(){this.paused=true;this.onpause?.();}
}
const root=new Element();root.children=[new Element()];
globalThis.document={activeElement:null,body:{},createElement:()=>new Element(),getElementById:()=>root,addEventListener(){},removeEventListener(){}};
globalThis.window={addEventListener(){},removeEventListener(){}};
globalThis.requestAnimationFrame=f=>f();
const setup=()=>{
 let completed=0,closed=0,released=0;
 const player=createEndingFilm({src:'movie.mp4',volume:.25,onComplete:()=>completed++,onClose:()=>closed++,haltModes(){},suspendAudio:()=>()=>released++});
 return {player,panel:mounted,video:mounted.querySelector('video'),completed:()=>completed,closed:()=>closed,released:()=>released};
};
const tick=()=>new Promise(r=>setTimeout(r,0));
let t=setup();await tick();assert.equal(t.completed(),0);t.panel.querySelector('.film-skip').onclick();await tick();assert.equal(t.completed(),0);assert.equal(t.closed(),1);assert.equal(t.released(),1);
t=setup();await tick();const ended=t.video.onended;ended();ended();t.player.dispose();await tick();assert.equal(t.completed(),1);assert.equal(t.closed(),1);assert.equal(t.released(),1);
t=setup();await tick();t.player.dispose();await tick();assert.equal(t.completed(),0);assert.equal(t.closed(),0);
t=setup();await tick();t.video.onerror();t.panel.querySelector('.film-skip').onclick();await tick();assert.equal(t.completed(),0);
failPlay=true;t=setup();await tick();assert.equal(t.panel.querySelector('.film-message').querySelector('p').textContent,'点击播放，继续观看结尾视频。');t.player.dispose();await tick();assert.equal(t.completed(),0);
console.log('PASS: completion only on ended; skip, dispose, media failure and autoplay rejection stay locked; duplicate end is idempotent.');
