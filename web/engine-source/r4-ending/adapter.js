/** MPL-2.0. WebGAL 4.6.4 adapter. Title replay never enters the scene runner. */
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
    haltModes:pP, suspendAudio, onClose:() => { endingFilmSession = null; onClose(); }});
  endingFilmSession = {dispose() { session.dispose(); endingFilmSession = null; }};
  return endingFilmSession;
}
function replayEndingFilm() {
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
