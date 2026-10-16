import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createBackgroundSwap} from './background-swap.mjs';
let clock=0,currentState={bgName:'old.webp'},drawn='old.webp',steps=0,events=0;
const stage={},textures=new Set(['old.webp']),loads=[],errors=[];
const swap=createBackgroundSwap({isStatic:u=>u.endsWith('.webp'),ready:(_,u)=>textures.has(u),
 load:(_,url,done)=>loads.push({url,done}),current:()=>currentState,commit:(_,s)=>drawn=s.bgName,
 failed:url=>errors.push(url),now:()=>clock,maxWait:1000});
const update=url=>{currentState={bgName:url};swap.update(stage,currentState,true)};
const bundle=fs.readFileSync(new URL('../../assets/index-r4-fast-background-20261016.js',import.meta.url),'utf8');
const start=bundle.indexOf('dp=()=>{'),end=bundle.indexOf(',EP=',start);
const game={isFast:true,pixiStage:stage};
// Run the actual shipped shared next-step handler, rather than a duplicate guard.
const step=vm.runInNewContext('('+bundle.slice(start+3,end)+')',{
 I:{gameplay:game,events:{userInteractNext:{emit:()=>events++}}},r4BackgroundSwap:swap,
 Pe:{getState:()=>({GUI:{showTitle:false}})},i5:()=>true,SP:()=>{},wP:()=>steps++});
update('new.webp');
for(clock=0;clock<650;clock+=50)step();
assert.equal(steps,0,'Text must wait for the requested background during fast-forward');
assert.equal(events,0);assert.equal(drawn,'old.webp');
textures.add('new.webp');loads.at(-1).done();step();
assert.equal(drawn,'new.webp');assert.equal(steps,1);assert.equal(swap.waiting(stage),false);
// Cached pictures never impose an artificial extra delay.
update('old.webp');step();assert.equal(steps,2);
// Fast-forward can be turned off while waiting; manual input remains usable.
update('manual.webp');game.isFast=false;step();assert.equal(steps,3);game.isFast=true;
// A failed image holds the last good frame, but releases the fast-forward gate.
loads.at(-1).done();step();assert.equal(steps,4);assert.equal(drawn,'old.webp');assert.equal(swap.holding(stage),true);
// A stalled load has a bounded wait. It can still commit if it eventually succeeds.
update('stalled.webp');clock+=1000;step();step();assert.equal(steps,6);assert.equal(errors.filter(x=>x==='stalled.webp').length,1);
textures.add('stalled.webp');loads.at(-1).done();assert.equal(drawn,'stalled.webp');
// Load/rollback invalidates pending callbacks without blocking later input.
update('abandoned.webp');const abandoned=loads.at(-1);update('old.webp');step();assert.equal(steps,7);
textures.add('abandoned.webp');abandoned.done();assert.equal(drawn,'old.webp');
assert.equal(swap.waiting(null),false);
console.log('PASS: real fast-forward step waits for cold backgrounds, cached swaps stay immediate, errors/timeouts/manual input and save rollback remain usable.');

// Confirm the actual scheduler uses the requested slower interval.
const rate=Number(bundle.match(/fast_timeout:(\d+)/)[1]);
const schedulerStart=bundle.indexOf('z$=(e=!1)=>{');
const schedulerEnd=bundle.indexOf(',eTe=',schedulerStart);
let scheduledDelay;game.fastInterval=null;
const startFast=vm.runInNewContext('('+bundle.slice(schedulerStart+3,schedulerEnd)+')',{
 dP:()=>{},I:{gameplay:game},Pe:{getState:()=>({userData:{optionData:{skipAll:true}}})},
 setInterval:(_,delay)=>{scheduledDelay=delay;return 1},X3:{fast_timeout:rate}});
startFast();assert.equal(scheduledDelay,150);
console.log('PASS: shared fast-forward scheduler runs at 150 ms.');
