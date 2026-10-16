import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const bundle=fs.readFileSync(new URL('../../assets/index-r4-ending-transition-20261016.js',import.meta.url),'utf8');
const boundary=fs.readFileSync(new URL('./boundary.js',import.meta.url),'utf8');
const game={isFast:false,isAuto:false,fastInterval:null};
const scene={currentScene:{sentenceList:[{command:0},{command:4,content:'./game/video/../../video-review/op_full_song_v10.mp4'},{command:11}]},currentSentenceId:1};
let title=false,halts=0,advances=0,interacts=0;
const context=vm.createContext({Pe:{getState:()=>({GUI:{showTitle:title}})},I:{sceneManager:{sceneData:scene},gameplay:game,events:{userInteractNext:{emit:()=>interacts++}},flowchartManager:{unlockPendingCurrentScene(){}}},ct:{video:4},endingFilmSession:null,pP(){halts++;game.isFast=game.isAuto=false},i5:()=>true,SP:()=>advances++,wP(){},r4BackgroundSwap:{waiting:()=>false},Y:{commit(){},applyCommittedPixiEffects(){}},dP(){},fo(){game.isFast=false},D_(){game.isAuto=false}});
vm.runInContext(boundary,context);
function get(start,end){let a=bundle.indexOf(start); assert.ok(a>=0,start); let b=bundle.indexOf(end,a);assert.ok(b>a,end);return vm.runInContext('('+bundle.slice(a+start.length,b)+')',context)}
const dp=get('dp=',',EP=');
for(const source of ['auto','fast','wheel']){game.isFast=true;game.isAuto=true;dp(source);assert.equal(advances,0);assert.equal(game.isFast,false);assert.equal(game.isAuto,false)}
dp();assert.equal(advances,1);assert.equal(interacts,1,'Manual click goes through the normal text settlement path');
advances=0;
const autoForward=get('Oa=',',dp=');autoForward();assert.equal(advances,0,'Automatic perform completion cannot enter video');
const fast=get('z$=',',eTe=');const auto=get('G$=',',JAe=');const wheelFast=get('eTe=',',pP=');
for(const enable of [fast,auto,wheelFast]){enable();assert.equal(game.isFast,false);assert.equal(game.isAuto,false)}
context.I.gameplay.performController={commitPendingPerforms(){}};
const commit=get('wP=',',Oa=');game.isFast=true;commit();assert.equal(game.isFast,false,'Stops immediately upon committing the final dialogue');
// Previous story lines, title screens, other videos, and an existing movie keep their normal behavior.
scene.currentSentenceId=0;dp('fast');assert.equal(advances,1);
scene.currentSentenceId=1;scene.currentScene.sentenceList[1].content='other.mp4';dp('auto');assert.equal(advances,2);
scene.currentScene.sentenceList[1].content='op_full_song_v10.mp4';title=true;assert.equal(vm.runInContext('r4AtEndingBoundary()',context),false);
title=false;context.endingFilmSession={};assert.equal(vm.runInContext('r4AtEndingBoundary()',context),false);
assert.ok(bundle.includes('dp("auto")')&&bundle.includes('dp("fast")')&&bundle.includes('dp("wheel")'));
console.log('PASS: final line stops fast/auto/held Ctrl/wheel and automatic perform advance; manual input proceeds; other story/video/title states unaffected.');
