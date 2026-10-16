/** MPL-2.0. Completion is independent of save slots and scoped to this game/video. */
export function createEndingUnlockStore(getStorage) {
  const completed = new Set();
  const storageKey = gameKey => `${gameKey}:ending-video:v10:completed`;
  return {
    isUnlocked(gameKey) {
      if (!gameKey) return false;
      try { return getStorage().getItem(storageKey(gameKey)) === '1' || completed.has(gameKey); }
      catch { return completed.has(gameKey); }
    },
    complete(gameKey) {
      if (!gameKey) return;
      completed.add(gameKey);
      try { getStorage().setItem(storageKey(gameKey), '1'); } catch { /* Keep session unlock if storage is unavailable. */ }
    }
  };
}
