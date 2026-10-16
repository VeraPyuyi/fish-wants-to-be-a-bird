/* WebGAL project patch, MPL-2.0. See ../../LICENSE-WebGAL-MPL-2.0.txt. */
export function createBackgroundSwap({ isStatic, ready, load, current, commit, failed,
  now = () => performance.now(), maxWait = 15000 }) {
  const requests = new WeakMap();
  return {
    holding(stage, target = 'bg-main') {
      return target === 'bg-main' && requests.has(stage);
    },
    waiting(stage) {
      const request = requests.get(stage);
      if (!request?.pending) return false;
      // A broken resource must not trap the player in fast-forward forever.
      // Its previous complete frame remains visible; a late success still commits.
      if (now() - request.started >= maxWait) {
        request.pending = false;
        failed(request.url);
        return false;
      }
      return true;
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
      const request = { url, state, skip, pending: true, started: now() };
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
          request.pending = false;
          failed(url);
          return;
        }
        requests.delete(stage);
        commit(stage, latest, request.skip);
      };
      try { load(stage, url, finish); }
      catch {
        if (requests.get(stage) === request) {
          request.pending = false;
          failed(url);
        }
      }
    },
  };
}
