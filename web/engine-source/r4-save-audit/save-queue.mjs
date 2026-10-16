/** MPL-2.0. Capture writes at request time; reads wait for earlier writes. */
export function createSaveQueue({getItem, setItem, clone}) {
  let tail = Promise.resolve();
  const run = task => (tail = tail.catch(() => {}).then(task));
  return {
    write(key, value) { const snapshot = clone(value); return run(() => setItem(key, snapshot)); },
    read(key) { return run(() => getItem(key)); },
    flush() { return tail; }
  };
}
