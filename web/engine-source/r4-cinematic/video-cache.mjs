/** MPL-2.0. One shared download during gameplay; reuse bytes for ending/replay. */
export function createEndingVideoCache({fetchVideo = (...args) => fetch(...args),
  makeURL = blob => URL.createObjectURL(blob), revokeURL = url => URL.revokeObjectURL(url)} = {}) {
  const entries = new Map();
  function prepare(src, retry = false) {
    let entry = entries.get(src);
    if (entry && !(retry && entry.failed)) return entry.promise;
    entry = {promise:null, url:null, failed:false, disposed:false};
    entries.set(src, entry);
    entry.promise = Promise.resolve().then(() => fetchVideo(src, {cache:'force-cache', priority:'low'}))
      .then(response => {
        if (!response.ok || response.status !== 200) throw new Error('Incomplete video response');
        return response.blob();
      }).then(blob => {
        if (!blob.size) throw new Error('Empty video');
        if (entry.disposed) return null;
        entry.url = makeURL(blob);
        return entry.url;
      }).catch(() => { entry.failed = true; return null; });
    return entry.promise;
  }
  return {prepare, dispose() {
    for (const entry of entries.values()) {
      entry.disposed = true;
      if (entry.url) revokeURL(entry.url);
    }
    entries.clear();
  }};
}
