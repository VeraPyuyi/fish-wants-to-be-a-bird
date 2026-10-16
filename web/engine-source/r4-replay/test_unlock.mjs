import assert from 'node:assert/strict';
import {createEndingUnlockStore} from './unlock.mjs';
const values=new Map([['game:saves1','existing save']]);
const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
const key='fish_wants_to_be_an_eagle_r4_20261011';
let store=createEndingUnlockStore(()=>storage);
assert.equal(store.isUnlocked(key),false);
assert.equal(store.isUnlocked(''),false);
assert.equal(values.size,1); // Reads, starts and skips do not write progress.
store.complete(key);
assert.equal(store.isUnlocked(key),true);
assert.equal(store.isUnlocked('different-game'),false);
assert.equal(values.get('game:saves1'),'existing save');
store=createEndingUnlockStore(()=>storage);
assert.equal(store.isUnlocked(key),true); // Reload persists.
const denied=createEndingUnlockStore(()=>{throw Error('storage disabled');});
assert.equal(denied.isUnlocked(key),false);denied.complete(key);assert.equal(denied.isUnlocked(key),true);
console.log('PASS: initially locked, completion persisted, namespaces isolated, save slots unchanged, unavailable-storage fallback.');
