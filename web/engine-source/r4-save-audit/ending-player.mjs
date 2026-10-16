/** MPL-2.0. Frameless ending, with screen-tap dismissal and no transport controls. */
export function createEndingFilm({src, volume, onClose, onComplete = () => {}, haltModes,
  suspendAudio, prepareVideo = () => Promise.resolve(src), mount = document.getElementById('root')}) {
  let closed = false, attempt = 0, blocked = false, failed = false;
  const oldFocus = document.activeElement;
  haltModes();
  const releaseAudio = suspendAudio();
  const panel = document.createElement('section');
  panel.id = 'ending-film'; panel.tabIndex = 0;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', '结尾视频，点击画面跳过');
  // Hold the current scene until the first video frame is ready; no loading card.
  panel.innerHTML = `<style>
    #ending-film{position:absolute;inset:0;z-index:9999;overflow:hidden;outline:none;cursor:pointer}
    #ending-film video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;opacity:0;pointer-events:none}
    #ending-film .film-notice{position:absolute;left:0;right:0;bottom:12%;margin:0;text-align:center;color:#fff;font:30px '思源宋体',serif;text-shadow:0 2px 8px #000;pointer-events:none}
    #ending-film .film-notice[hidden]{display:none}
  </style><video playsinline preload="auto" disablepictureinpicture></video><p class="film-notice" role="status" hidden></p>`;
  const video = panel.querySelector('video');
  const notice = panel.querySelector('.film-notice');
  video.controls = false; video.disablePictureInPicture = true;
  video.tabIndex = -1; video.setAttribute('aria-hidden','true');
  const siblings = [...mount.children].map(node => ({node, inert:node.inert}));
  siblings.forEach(({node}) => { node.inert = true; });
  mount.append(panel);
  video.volume = Math.max(0, Math.min(1, Number(volume) || 0));
  const show = text => { if (!closed) { notice.textContent = text; notice.hidden = false; } };
  const started = () => {
    if (closed) return;
    blocked = failed = false; notice.hidden = true; video.style.opacity = '1';
  };
  const mediaFailed = () => {
    if (closed) return;
    blocked = false; failed = true;
    show('视频暂时无法播放，轻触画面继续');
  };
  const play = () => {
    if (closed) return;
    const serial = ++attempt;
    blocked = false; notice.hidden = true;
    try {
      Promise.resolve(video.play()).then(() => {
        if (!closed && serial === attempt && video.readyState >= 2) started();
      }).catch(error => {
        if (closed || serial !== attempt) return;
        if (error?.name === 'NotAllowedError') {
          blocked = true; show('轻触画面开始播放');
        } else mediaFailed();
      });
    } catch { mediaFailed(); }
  };
  const close = (notify = true) => {
    if (closed) return;
    closed = true; attempt++;
    document.removeEventListener('keydown', keys, true);
    document.removeEventListener('keyup', keys, true);
    window.removeEventListener('pagehide', pagehide);
    video.onended = video.onerror = video.onplaying = video.onpause = null;
    video.pause(); video.removeAttribute('src'); video.load(); panel.remove();
    siblings.forEach(({node, inert}) => { node.inert = inert; });
    haltModes();
    if (notify) onClose();
    setTimeout(releaseAudio, 0);
    requestAnimationFrame(() => {
      const target = oldFocus?.isConnected && oldFocus !== document.body ? oldFocus : document.getElementById('ending-replay');
      target?.focus({preventScroll:true});
    });
  };
  const activate = () => { if (blocked) play(); else close(); };
  const keys = event => {
    event.stopImmediatePropagation(); event.preventDefault();
    if (event.type !== 'keydown' || event.repeat) return;
    if (event.key === 'Escape') close();
    else if (event.key === ' ' || event.key === 'Enter') activate();
  };
  // Leaving a page must also release the engine's blocking perform. BFCache can
  // restore this same JS state; removing just the panel would strand the game.
  const pagehide = () => close();
  document.addEventListener('keydown', keys, true);
  document.addEventListener('keyup', keys, true);
  window.addEventListener('pagehide', pagehide);
  for (const type of ['dblclick','pointerdown','pointerup','contextmenu','wheel']) panel.addEventListener(type, event => { event.stopPropagation(); if(type==='contextmenu')event.preventDefault(); });
  panel.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); activate(); });
  video.onended = () => { if (!closed) { onComplete(); close(); } };
  video.onerror = mediaFailed; video.onplaying = started;
  video.onpause = () => {
    if (!closed && !video.ended && !blocked && !failed) { blocked = true; show('轻触画面继续播放'); }
  };
  panel.focus({preventScroll:true});
  const serial = ++attempt;
  Promise.resolve().then(() => prepareVideo(src)).catch(() => null).then(cached => {
    if (closed || serial !== attempt) return;
    video.src = cached || src; video.load(); play();
  });
  return {dispose: () => close(false)};
}
