import assert from 'node:assert/strict';
import {createEndingVideoCache} from '../r4-cinematic/video-cache.mjs';
import {createEndingFilm} from './ending-player.mjs';
import {enterGameFullscreen,exitGameFullscreen} from '../r4-cinematic/fullscreen.mjs';

const tick=()=>new Promise(r=>setTimeout(r,0));
let downloads=0,resolveDownload,urls=0,revoked=[];
const cache=createEndingVideoCache({fetchVideo:()=>{downloads++;return new Promise(r=>resolveDownload=r)},makeURL:()=>`blob:${++urls}`,revokeURL:u=>revoked.push(u)});
const warm=cache.prepare('movie');await tick();
const ending=cache.prepare('movie',true);assert.equal(downloads,1);assert.equal(warm,ending);
resolveDownload({ok:true,status:200,blob:async()=>({size:100})});assert.equal(await ending,'blob:1');
assert.equal(await cache.prepare('movie',true),'blob:1');assert.equal(downloads,1);
cache.dispose();assert.deepEqual(revoked,['blob:1']);
const late=cache.prepare('later');await tick();cache.dispose();resolveDownload({ok:true,status:200,blob:async()=>({size:100})});assert.equal(await late,null);assert.equal(urls,1);
let calls=0;
const retry=createEndingVideoCache({fetchVideo:async()=>{calls++;return {ok:true,status:calls===1?206:200,blob:async()=>({size:1})}},makeURL:()=> 'blob:retry'});
assert.equal(await retry.prepare('bad'),null);assert.equal(await retry.prepare('bad'),null);assert.equal(calls,1);
assert.equal(await retry.prepare('bad',true),'blob:retry');assert.equal(calls,2);
assert.equal(await createEndingVideoCache({fetchVideo:async()=>({ok:true,status:200,blob:async()=>({size:0})})}).prepare('empty'),null);

let mounted,failPlay=false,plays=0,holdFade=false,finishFade;
class Element {
  hidden=false; children=[]; inert=false; isConnected=true; style={}; listeners=new Map(); nodes=new Map(); attributes={};
  animate(frames,options){
    assert.deepEqual(frames,[{opacity:0},{opacity:1}]); assert.equal(options.duration,900);
    let complete,reject;
    const finished=new Promise((r,j)=>{complete=r;reject=j});
    finishFade=complete;
    if(!holdFade)queueMicrotask(complete);
    return {finished,cancel(){reject(new Error('cancelled'))}};
  }
  setAttribute(k,v){this.attributes[k]=v} removeAttribute(k){delete this.attributes[k]} load(){}
  querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,s==='video'?new Media():new Element());return this.nodes.get(s)}
  append(n){this.children.push(n);mounted=n} remove(){this.isConnected=false}
  addEventListener(k,f){this.listeners.set(k,f)} removeEventListener(k){this.listeners.delete(k)} focus(){}
}
class Media extends Element {
  paused=true;readyState=4;
  play(){plays++;if(failPlay)return Promise.reject(new DOMException('blocked','NotAllowedError'));this.paused=false;this.onplaying?.();return Promise.resolve()}
  pause(){this.paused=true;this.onpause?.()}
}
const root=new Element();const sibling=new Element();root.children=[sibling];
const docListeners=new Map();
globalThis.document={activeElement:null,body:{},createElement:()=>new Element(),getElementById:()=>root,
  addEventListener:(k,f)=>docListeners.set(k,f),removeEventListener:k=>docListeners.delete(k)};
const windowEvents=new Map();globalThis.window={addEventListener:(k,f)=>windowEvents.set(k,f),removeEventListener:k=>windowEvents.delete(k)};globalThis.requestAnimationFrame=f=>f();
const setup=(prepareVideo=async()=> 'blob:cached')=>{
  let complete=0,closed=0,released=0;
  const player=createEndingFilm({src:'movie',volume:.25,prepareVideo,onComplete:()=>complete++,onClose:()=>closed++,haltModes(){},suspendAudio:()=>()=>released++});
  return {player,panel:mounted,video:mounted.querySelector('video'),notice:mounted.querySelector('.film-notice'),counts:()=>({complete,closed,released})};
};
const event=key=>({type:'keydown',key,repeat:false,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true},stopImmediatePropagation(){this.stopped=true}});
const tap=t=>{const e=event();t.panel.listeners.get('click')(e);assert.ok(e.prevented&&e.stopped)};
let t=setup();assert.equal(sibling.inert,true);await tick();assert.equal(t.video.src,'blob:cached');assert.equal(t.video.controls,false);assert.equal(t.notice.hidden,true);assert.ok(!/<button|<input|controls[= >]/.test(t.panel.innerHTML));tap(t);await tick();assert.deepEqual(t.counts(),{complete:0,closed:1,released:1});assert.equal(sibling.inert,false);assert.equal(docListeners.size,0);
t=setup();await tick();const ended=t.video.onended;ended();ended();t.player.dispose();await tick();assert.deepEqual(t.counts(),{complete:1,closed:1,released:1});
let finishPrepare;t=setup(()=>new Promise(r=>finishPrepare=r));await tick();const before=plays;tap(t);finishPrepare('blob:late');await tick();assert.equal(plays,before);assert.equal(t.counts().complete,0);
failPlay=true;t=setup();await tick();assert.equal(t.notice.textContent,'轻触画面开始播放');assert.equal(t.notice.hidden,false);failPlay=false;tap(t);await tick();assert.equal(t.notice.hidden,true);assert.equal(t.counts().closed,0);tap(t);await tick();assert.equal(t.counts().complete,0);
t=setup();await tick();t.video.onerror();assert.equal(t.notice.hidden,false);tap(t);await tick();assert.equal(t.counts().complete,0);
t=setup();await tick();const key=event('Enter');docListeners.get('keydown')(key);await tick();assert.ok(key.stopped&&key.prevented);assert.equal(t.counts().closed,1);
t=setup();await tick();t.player.dispose();await tick();assert.deepEqual(t.counts(),{complete:0,closed:0,released:1});
let full=0,exits=0;const element={requestFullscreen(){assert.equal(this,element);full++;return Promise.resolve()}};
document.documentElement=element;document.exitFullscreen=()=>{exits++};await enterGameFullscreen();assert.equal(full,1);document.fullscreenElement=element;await enterGameFullscreen();assert.equal(full,1);await exitGameFullscreen();assert.equal(exits,1);
document.fullscreenElement=null;element.requestFullscreen=()=>Promise.reject(new Error('denied'));await enterGameFullscreen();
delete element.requestFullscreen;element.webkitRequestFullscreen=()=>full++;await enterGameFullscreen();assert.equal(full,2);delete element.webkitRequestFullscreen;await enterGameFullscreen();
console.log('PASS: shared preload/replay bytes, cache retry/disposal, frameless tap skip, natural-end-only unlock, autoplay recovery, failure exit, late-load cancellation, input isolation, audio release, fullscreen and fallback.');

t=setup();await tick();windowEvents.get('pagehide')();await tick();assert.deepEqual(t.counts(),{complete:0,closed:1,released:1});assert.equal(windowEvents.size,0);console.log('PASS: pagehide releases the engine callback, avoiding a removed-player deadlock after back navigation.');

holdFade=true; const beforeFade=plays; t=setup(); await tick();
assert.equal(t.panel.attributes['data-phase'],'fading');
assert.equal(t.video.src,'blob:cached'); assert.equal(plays,beforeFade,'No hidden playback during the story fade');
tap(t); assert.equal(t.counts().closed,0,'Opening double click cannot skip');
finishFade(); await tick(); assert.equal(plays,beforeFade+1); assert.equal(t.panel.attributes['data-phase'],'playing');
tap(t); await tick(); assert.equal(t.counts().closed,1);
// Disposing while the veil animates must not start the movie later.
t=setup(); await tick(); const beforeDispose=plays; const finishCancelledFade=finishFade; t.player.dispose();
finishCancelledFade(); await tick(); assert.equal(plays,beforeDispose); assert.equal(t.counts().released,1);
assert.equal(t.counts().complete,0);
console.log('PASS: full-scene fade finishes before media playback; click protection during fade; disposal cancels late play and releases audio.');
