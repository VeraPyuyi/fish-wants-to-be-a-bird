/** MPL-2.0. WebGAL 4.6.4 adapter. Load-menu replay never enters the scene runner. */
const endingVideoCache = createEndingVideoCache();
function preloadEndingFilm() {
  endingVideoCache.prepare(new URL('./video-review/op_full_song_v10.mp4', document.baseURI).href);
}
let endingFilmSession = null;
function openEndingFilm(src, onClose) {
  if (endingFilmSession) return endingFilmSession;
  const suspendAudio = () => {
    const releases = [];
    for (const track of new Set([...document.querySelectorAll('audio'), ...opLocalTransientAudio])) {
      const controller = opLocalBgmControllers.get(track);
      if (controller) { releases.push(controller.suspend('ending-v10')); continue; }
      const stop = () => { if (!track.paused) track.pause(); };
      track.addEventListener('play', stop); track.pause();
      releases.push(() => track.removeEventListener('play', stop));
    }
    return () => releases.forEach(release => release());
  };
  const session = createEndingFilm({src, volume:Pe.getState().userData.optionData.volumeMain * .01 * Pe.getState().userData.optionData.bgmVolume * .01,
    haltModes:pP, suspendAudio, prepareVideo:url => endingVideoCache.prepare(new URL(url, document.baseURI).href, true),
    onComplete:() => {
      if (src.endsWith('/op_full_song_v10.mp4')) {
        endingUnlockStore.complete(I.gameKey);
        window.dispatchEvent(new Event('ending-v10-completed'));
      }
    }, onClose:() => { endingFilmSession = null; onClose(); }});
  endingFilmSession = {dispose() { session.dispose(); endingFilmSession = null; }};
  return endingFilmSession;
}
function replayEndingFilm() {
  if (!endingUnlockStore.isUnlocked(I.gameKey)) return;
  enterGameFullscreen();
  openEndingFilm(new URL('./video-review/op_full_song_v10.mp4', document.baseURI).href, () => {});
}
function createEndingPerform(e) {
  const performName = EP();
  let player = null;
  return {performName, duration:2147483647, isHoldOn:false,
    startFunction:() => { player = openEndingFilm(e.content, () => I.gameplay.performController.unmountPerform(performName)); },
    stopFunction:() => { player?.dispose(); player = null; },
    blockingNext:() => true, blockingAuto:() => true, blockingStateCalculation:() => true, goNextWhenOver:true};
}

const endingUnlockStore = createEndingUnlockStore(() => window.localStorage);
function EndingReplayEntry() {
  const [unlocked, setUnlocked] = te.useState(() => endingUnlockStore.isUnlocked(I.gameKey));
  te.useEffect(() => {
    const refresh = () => setUnlocked(endingUnlockStore.isUnlocked(I.gameKey));
    refresh();
    window.addEventListener('ending-v10-completed', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('ending-v10-completed', refresh); window.removeEventListener('storage', refresh); };
  }, []);
  return C.jsxs('div', {style:{height:'8%',display:'flex',alignItems:'center',justifyContent:'center',gap:'28px'},children:[
    C.jsx('button',{id:'ending-replay',type:'button','aria-label':'重播结尾视频','aria-describedby':unlocked?undefined:'ending-replay-hint',disabled:!unlocked,onClick:replayEndingFilm,
      style:{font:'32px 思源宋体,serif',padding:'14px 28px',border:'1px solid '+(unlocked?'#37748b':'#9ba6ac'),borderRadius:'8px',color:unlocked?'#16465a':'#74828a',background:unlocked?'#eaf3f4':'#e2e6e8',cursor:unlocked?'pointer':'not-allowed'},children:'重播结尾视频'}),
    !unlocked&&C.jsx('span',{id:'ending-replay-hint',style:{fontSize:'26px',color:'#647480'},children:'完整观看结尾视频后解锁'})]});
}
