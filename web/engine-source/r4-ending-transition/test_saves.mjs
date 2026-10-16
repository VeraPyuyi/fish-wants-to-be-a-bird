import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createSaveQueue} from '../r4-save-audit/save-queue.mjs';
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const tick=()=>new Promise(r=>setTimeout(r,0));
const bundle=fs.readFileSync(new URL('../../assets/index-r4-ending-transition-20261016.js',import.meta.url),'utf8');
const baseline=fs.readFileSync(new URL('../../assets/index-r4-cinematic-20261016.js',import.meta.url),'utf8');
function fn(text,name,end,ctx){const start=text.indexOf(name);assert.ok(start>=0);const stop=text.indexOf(end,start);assert.ok(stop>start);return vm.runInNewContext('('+text.slice(start,stop)+')',ctx)}
let state={saveData:{quickSaveData:{scene:12},saveData:[{scene:5}]},GUI:{showTitle:false}};
let deleted=0,writes=0,cancel=0;
const ctx={Pe:{getState:()=>state,dispatch:action=>{if(action==='delete'){deleted++;state.saveData.quickSaveData=null}}},wa:{resetFastSave:()=> 'delete'},J$:{cancel:()=>cancel++},K$:()=>writes++,ee:{error(){}}};
await fn(baseline,'async function bTe()','const STe=',ctx)();assert.equal(state.saveData.quickSaveData,null);assert.equal(deleted,1);assert.equal(writes,1);
state.saveData.quickSaveData={scene:12};ctx.r4SaveIO={flush:()=>Promise.resolve()};await fn(bundle,'async function bTe()','const STe=',ctx)();assert.equal(state.saveData.quickSaveData.scene,12);assert.equal(state.saveData.saveData[0].scene,5);assert.equal(deleted,1);assert.equal(writes,1);

const disk=new Map();let releaseFirst,started=0;
const q=createSaveQueue({clone,getItem:async k=>disk.get(k),setItem:async(k,v)=>{if(++started===1)await new Promise(r=>releaseFirst=r);disk.set(k,v)}});
const snapshot={id:12};const first=q.write('auto',snapshot);snapshot.id=999;const read=q.read('auto');const clear=q.write('auto',null);await tick();releaseFirst();assert.equal((await read).id,12);await clear;assert.equal(await q.read('auto'),null);
let fails=true;const resilient=createSaveQueue({clone,getItem:async k=>disk.get(k),setItem:async(k,v)=>{if(fails){fails=false;throw Error('quota')}disk.set(k,v)}});
await assert.rejects(resilient.write('x',1));await resilient.write('x',2);assert.equal(await resilient.read('x'),2);

let storedAuto=null,storedQuick={sceneData:{currentSentenceId:23}},dispatched;
const readContext={I:{gameKey:'same-key'},r4SaveIO:{read:async key=>key.endsWith('saves-fast')?storedAuto:storedQuick},Pe:{dispatch:x=>dispatched=x},wa:{setFastSave:x=>x},ee:{info(){}}};
await fn(bundle,'async function mP()','const WE=',readContext)();assert.equal(dispatched,storedQuick,'Legacy deleted continue recovers from surviving quick slot');storedAuto={sceneData:{currentSentenceId:48}};await fn(bundle,'async function mP()','const WE=',readContext)();assert.equal(dispatched,storedAuto);

let autoWrites=0,ending=false,locked=false,savedCount=0;
const saveContext={r4IsEndingState:()=>ending,Pe:{getState:()=>state,dispatch:()=>savedCount++},I:{sceneManager:{sceneData:{currentSentenceId:30},get lockSceneWrite(){return locked}}},X$:()=>({scene:30}),vt:clone,wa:{setFastSave:x=>x},K$:()=>autoWrites++};
const autosave=fn(bundle,'async function yP()','const J$=',saveContext);
ending=true;await autosave();assert.equal(autoWrites,0);ending=false;await autosave();assert.equal(autoWrites,1);state.GUI.showTitle=true;await autosave();assert.equal(autoWrites,1);state.GUI.showTitle=false;

let checkpoint=0;
const checkpointCtx={J$:{cancel(){}},I:{sceneManager:{sceneData:{currentSentenceId:2,currentScene:{sentenceList:[{}, {},{command:99},{command:0}]}}}},ct:{video:99},yP:async()=>checkpoint++,ee:{error(){}}};
const capture=fn(bundle,'function r4CheckpointBeforeEnding()','function QuickSaveLoadEntry()',checkpointCtx);capture();await tick();assert.equal(checkpoint,1);checkpointCtx.I.sceneManager.sceneData.currentSentenceId=3;capture();assert.equal(checkpoint,1);

let saveCalls=0;const manualCtx={Pe:{getState:()=>state,dispatch(){}},r4IsEndingState:()=>ending,I:{sceneManager:{get lockSceneWrite(){return locked}}},ee:{warn(){}},X$:()=>({}),wa:{saveGame:x=>x},Vg:()=>saveCalls++};
const a=bundle.indexOf('const WE=')+9,b=bundle.indexOf(';function X$',a);const manual=vm.runInNewContext('('+bundle.slice(a,b)+')',manualCtx);
state.GUI.showTitle=true;manual(0);assert.equal(saveCalls,0);state.GUI.showTitle=false;ending=true;manual(0);assert.equal(saveCalls,0);ending=false;manual(0);assert.equal(saveCalls,1);
assert.ok(bundle.includes('pP();J$.cancel();const t=e;'),'Loading stops fast/auto before restoration');
assert.ok(bundle.includes('C.jsx(QuickSaveLoadEntry,{})'));
assert.ok(bundle.includes('const pagehide = () => close();'));
console.log('PASS: reproduced old deletion; ending retains both slots; immutable ordered writes/read barriers; explicit clear cannot be overtaken; storage failures recover; legacy quick-slot fallback; ending/title save guards; pre-film checkpoint; load halts auto/fast; visible quick-load entry.');
