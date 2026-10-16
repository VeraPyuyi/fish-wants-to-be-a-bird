/* WebGAL project patch, MPL-2.0. See ../../LICENSE-WebGAL-MPL-2.0.txt. */
export function createBackgroundSwap({ isStatic, ready, load, current, commit, failed }) {
  const requests = new WeakMap();
  return {
    holding(stage, target = 'bg-main') {
      return target === 'bg-main' && requests.has(stage);
    },
    update(stage, state, skip) {
      const url = state.bgName;
      const previous = requests.get(stage);
      // An explicit clear, a load/rollback, or a newer scene invalidates old callbacks.
      if (!isStatic(url) || ready(stage, url)) {
        requests.delete(stage);
        commit(stage, state, skip);
        return;
      }
      if (previous?.url === url) {
        previous.state = state;
        previous.skip = skip;
        return;
      }
      const request = { url, state, skip };
      requests.set(stage, request);
      const finish = () => {
        if (requests.get(stage) !== request) return;
        const latest = current(stage);
        if (!latest || latest.bgName !== url) {
          requests.delete(stage);
          return;
        }
        if (!ready(stage, url)) {
          // Keep the last complete frame and its transform until retry/navigation.
          failed(url);
          return;
        }
        requests.delete(stage);
        commit(stage, latest, request.skip);
      };
      try { load(stage, url, finish); }
      catch { if (requests.get(stage) === request) failed(url); }
    },
  };
}
