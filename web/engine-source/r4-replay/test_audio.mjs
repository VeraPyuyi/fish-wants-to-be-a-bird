/** Deterministic tests run the real controller source, with a controllable clock. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createR4BgmController, opLocalBgmControllers } from './bgm-controller.mjs';
let now=0, id=0; const frames=new Map();
globalThis.document={baseURI:'http://localhost/'};
Object.defineProperty(globalThis,'performance',{value:{now:()=>now},configurable:true});
globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};
globalThis.cancelAnimationFrame=n=>frames.delete(n);
const tick=async ms=>{now+=ms;const work=[...frames.values()];frames.clear();work.forEach(f=>f(now));await Promise.resolve();await Promise.resolve();};
class Audio extends EventTarget{
  paused=true;volume=.6;src='';ended=false;plays=0;
  getAttribute(name){return name==='src'?this.src||null:null;}
  removeAttribute(){this.src='';} load(){}
  play(){this.plays++;this.paused=false;this.dispatchEvent(new Event('play'));return Promise.resolve();}
  pause(){if(!this.paused){this.paused=true;this.dispatchEvent(new Event('pause'));}}
}
const options={src:'music.mp3',targetVolume:.6,enter:400,enabled:true,isTitle:false};
const setup=async()=>{const a=new Audio();let stopped=0;const c=createR4BgmController(a,()=>stopped++);c.update(options);await tick(0);return{a,c,stopped:()=>stopped};};
const checks=[];
let h=await setup();await tick(160);const before=h.a.volume;assert(before>0&&before<.6);
let release=h.c.suspend('OP'), inner=h.c.suspend('nested');await tick(5000);
assert.equal(h.a.volume,0);assert(h.a.paused);release();assert(h.a.paused);inner();inner();
assert.equal(h.a.volume,before);await tick(0);await tick(240);assert.equal(h.a.volume,.6);assert(!h.a.paused);
checks.push('nested idempotent ownership; exact entry gain; in-flight fade-in freezes and resumes');h.c.dispose();
h=await setup();await tick(500);h.c.update({...options,enter:-800});await tick(200);const stopVolume=h.a.volume;
release=h.c.suspend('OP');await tick(5000);assert.equal(h.stopped(),0);assert(h.a.src.endsWith('music.mp3'));
release();assert.equal(h.a.volume,stopVolume);await tick(0);await tick(590);assert.equal(h.stopped(),0);await tick(10);
assert.equal(h.stopped(),1);assert.equal(h.a.src,'');assert(h.a.paused);h.c.dispose();checks.push('stop fade and commit callback wait for remaining duration after OP');
h=await setup();await tick(500);h.c.update({...options,src:'next.mp3'});await tick(90);release=h.c.suspend('OP');await tick(1000);
assert(h.a.src.endsWith('music.mp3'));release();await tick(0);await tick(110);await tick(400);assert(h.a.src.endsWith('next.mp3'));assert.equal(h.a.volume,.6);
h.c.dispose();checks.push('source-switch fade pauses on old track and completes new-track fade after release');
h=await setup();await tick(500);h.a.pause();release=h.c.suspend('OP');h.c.update({...options,targetVolume:.3});await tick(5000);const plays=h.a.plays;
release();assert(h.a.paused);assert.equal(h.a.plays,plays);assert.equal(h.a.volume,.6);h.a.play();await tick(0);await tick(240);assert.equal(h.a.volume,.3);
h.c.dispose();checks.push('pre-existing user pause survives hold and settings update; user play restores desired gain');
h=await setup();await tick(500);release=h.c.suspend('OP');h.c.update({...options,targetVolume:0});release();await tick(0);assert.equal(h.a.volume,0);
h.c.dispose();checks.push('settings mute during suspension wins over saved gain');
h=await setup();await tick(100);release=h.c.suspend('OP');const count=h.a.plays;h.c.dispose();release();release();await tick(1000);
assert(h.a.paused);assert.equal(h.a.plays,count);assert(!opLocalBgmControllers.has(h.a));checks.push('dispose invalidates leases and queued envelopes without resurrecting audio');
const a=new Audio();let resolvePlay;a.play=function(){this.plays++;this.paused=false;return new Promise(r=>resolvePlay=r);};
const c=createR4BgmController(a,()=>{});c.update(options);release=c.suspend('OP');resolvePlay();await tick(1000);assert(a.paused);assert.equal(a.volume,0);
c.dispose();release();assert(a.paused);checks.push('pending play settlement during suspension cannot restart envelope or audio');
const report={status:'passed',checks};
console.log(JSON.stringify(report));
