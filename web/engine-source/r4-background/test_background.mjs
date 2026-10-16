import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createBackgroundSwap} from './background-swap.mjs';

const stage = {}, textures = new Set(['old.webp']), pending = [], commits = [], failures = [];
let visible = 'old.webp', latest = {bgName:visible,effects:[]};
const swap = createBackgroundSwap({
  isStatic:u=>u.endsWith('.webp'), ready:(_,u)=>textures.has(u),
  load:(_,u,done)=>pending.push({u,done}), current:()=>latest,
  commit:(_,s,skip)=>{visible=s.bgName;commits.push({s,skip})}, failed:u=>failures.push(u),
});
function update(url, skip=false, effects=[]) {latest={bgName:url,effects};swap.update(stage,latest,skip)}
update('new.webp',true);
assert.equal(visible,'old.webp');
assert.equal(swap.holding(stage),true);
assert.equal(swap.holding(stage,'fig-left'),false);
update('new.webp',true,[{target:'bg-main',transform:{scale:{x:2,y:2}}}]);
assert.equal(pending.length,1);
textures.add('new.webp');pending[0].done();
assert.equal(visible,'new.webp');assert.equal(swap.holding(stage),false);
assert.equal(commits.at(-1).s.effects[0].transform.scale.x,2);
update('slow.webp');const slow=pending.at(-1);
update('later.webp');const later=pending.at(-1);
textures.add('slow.webp');slow.done();assert.equal(visible,'new.webp');
textures.add('later.webp');later.done();assert.equal(visible,'later.webp');
update('pending.webp');const abandoned=pending.at(-1);
update('');textures.add('pending.webp');abandoned.done();assert.equal(visible,'');
update('old.webp');update('bad.webp');pending.at(-1).done();
assert.equal(visible,'old.webp');assert.equal(swap.holding(stage),true);assert.deepEqual(failures,['bad.webp']);
update('new.webp');assert.equal(visible,'new.webp');assert.equal(swap.holding(stage),false);
update('late-save.webp');const beforeLoad=pending.at(-1);update('old.webp',true);
textures.add('late-save.webp');beforeLoad.done();assert.equal(visible,'old.webp');

// Execute the shipped renderer method: cached textures must be drawable immediately,
// before the old background's exit can reveal an empty container for one frame.
const bundle=fs.readFileSync(new URL('../../assets/index-r4-background-20261016.js',import.meta.url),'utf8');
const method=bundle.slice(bundle.indexOf('addBg(t,r){'),bundle.indexOf('addVideoBg(t,r){'));
class Container {constructor(){this.children=[];this.pivot={set(){}}}addChild(c){this.children.push(c)}setBaseX(){}setBaseY(){}}
class Sprite {constructor(){this.scale={};this.anchor={set(){}};this.position={}}}
const renderer=vm.runInNewContext('({'+method+'})',{ll:Container,co:Sprite,ya:()=> 'test-id'});
Object.assign(renderer,{assetLoader:{resources:{'ready.webp':{texture:{width:1920,height:1080,valid:true}}}},
 backgroundObjects:[],backgroundContainer:new Container(),stageWidth:1920,stageHeight:1080,
 getExtName:()=> 'webp',getStageObjByUuid(id){return this.backgroundObjects.find(o=>o.uuid===id)},
 cacheGC(){},notifyTargetReferenceBoxChanged(){},requestRender(){},loadAsset(){throw Error('Unexpected load')},
 removeStageObjectByKey(key){this.backgroundObjects=this.backgroundObjects.filter(o=>o.key!==key)}});
renderer.addBg('bg-main','ready.webp');
assert.equal(renderer.backgroundObjects[0].pixiContainer.children.length,1);
assert.ok(bundle.includes('if(r4BackgroundSwap.holding(this,n))return;'));
assert.ok(bundle.includes('n.includes(o)||r4BackgroundSwap.holding(t,o)'));
console.log('PASS: synchronous cached drawing; delayed loading preserves old frame; rapid replacement, failed load, latest transform, clear, and save-load cancellation.');
