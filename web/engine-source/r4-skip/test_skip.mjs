import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { normalizeR4SkipOptions } from './skip-options.mjs';

const defaults = { skipAll: true, fishSkipModeVersion: 1, bgmVolume: 25 };
assert.deepEqual(normalizeR4SkipOptions({}, defaults), defaults);
const legacy = { skipAll: false, bgmVolume: 13, textSpeed: 81 };
const migrated = normalizeR4SkipOptions(legacy, defaults);
assert.equal(migrated.skipAll, true);
assert.equal(migrated.bgmVolume, 13);
assert.equal(migrated.textSpeed, 81);
assert.equal(legacy.skipAll, false, 'Do not mutate loaded user data');
const deliberateRead = { ...migrated, skipAll: false };
assert.equal(normalizeR4SkipOptions(deliberateRead, defaults).skipAll, false);
assert.deepEqual(normalizeR4SkipOptions(migrated, defaults), migrated);

// Exercise the actual shipped settings loader and fast-forward timer, rather
// than a second implementation of either behavior.
const source = fs.readFileSync(new URL('../../assets/index-r4-skip-20261016.js', import.meta.url), 'utf8');
const ap = source.slice(source.indexOf('function AP(e)'), source.indexOf('async function s5()'));
const timers = source.slice(source.indexOf('let Vh=null;'), source.indexOf(',B_=(e,t=!0,r={})')) + ';';
const fixture = { optionData: deliberateRead, readHistory: { chapter: [1, 2] }, globalGameVar: { choice: 2 }, appreciationData: { bgm: [], cg: [] }, scriptManagedGlobalVar: [], gameConfigInit: {} };
let callback, advances = 0, blocked = false, read = false;
const gameplay = { isFast: false, fastInterval: null };
const context = vm.createContext({
  fc: { ...fixture, optionData: defaults }, vt: structuredClone,
  normalizeR4SkipOptions, fixture,
  I: { gameplay }, Pe: { getState: () => ({ userData: fixture }) },
  Y: { getCalculationStageState: () => ({ isRead: read }) }, X3: { fast_timeout: 50 },
  document: { getElementById: () => null }, De: {}, D_: () => {},
  dp: () => { if (!blocked) advances++; },
  setInterval: fn => { callback = fn; return 1; }, clearInterval: () => { callback = null; },
  setTimeout: () => 2, clearTimeout: () => {},
});
vm.runInContext(ap + timers, context);
vm.runInContext('loaded = AP(fixture)', context);
assert.equal(context.loaded.optionData.skipAll, false);
assert.deepEqual(JSON.parse(JSON.stringify(context.loaded.readHistory)), fixture.readHistory);
assert.deepEqual(JSON.parse(JSON.stringify(context.loaded.globalGameVar)), fixture.globalGameVar);
vm.runInContext('z$()', context); callback();
assert.equal(advances, 0); assert.equal(gameplay.fastInterval, null);
fixture.optionData = migrated;
vm.runInContext('z$()', context); callback(); callback();
assert.equal(advances, 2, 'Unread dialogue advances in all mode');
blocked = true; callback(); assert.equal(advances, 2, 'Engine blockers are still honored');
vm.runInContext('V$()', context); assert.equal(gameplay.fastInterval, null);
fixture.optionData = deliberateRead; blocked = false;
vm.runInContext('z$(!0)', context); callback();
assert.equal(advances, 3, 'Ctrl can temporarily skip unread text');
vm.runInContext('fo()', context); assert.equal(gameplay.isFast, false);
console.log('PASS: fresh/legacy defaults, one-time migration, explicit read preference, preserved user data, all/read/forced skip and manual stop.');
