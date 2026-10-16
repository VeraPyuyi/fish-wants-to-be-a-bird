/** MPL-2.0. Stop on the final text; only deliberate reading input enters the film. */
function r4AtEndingBoundary() {
  if (Pe.getState().GUI.showTitle || endingFilmSession) return false;
  const scene = I.sceneManager.sceneData;
  const next = scene.currentScene.sentenceList[scene.currentSentenceId];
  return next?.command === ct.video && /(?:^|\/)op_full_song_v10\.mp4(?:[?#].*)?$/.test(next.content);
}
function r4StopAtEndingBoundary() {
  if (!r4AtEndingBoundary()) return false;
  pP();
  return true;
}
