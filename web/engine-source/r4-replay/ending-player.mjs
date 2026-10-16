/** MPL-2.0. Shared, lazy ending-film player for native playVideo and load-menu replay. */
export function createEndingFilm({src, volume, onClose, onComplete = () => {}, closeText = "跳过并返回首页", haltModes, suspendAudio, mount = document.getElementById('root')}) {
  let closed = false, attempt = 0, timer = 0;
  const oldFocus = document.activeElement;
  haltModes();
  const releaseAudio = suspendAudio();
  const panel = document.createElement('section');
  panel.id = 'ending-film'; panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '故事结尾视频');
  panel.innerHTML = `<style>
    #ending-film{position:absolute;inset:0;z-index:9999;background:#050a10;color:#f4ead5;font:32px '思源宋体',serif;overflow:hidden}
    #ending-film video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
    #ending-film .film-heading{position:absolute;top:30px;left:44px;margin:0;padding:12px 22px;background:#071c27bd;font-size:30px;border-radius:8px}
    #ending-film .film-controls{position:absolute;bottom:0;left:0;right:0;display:flex;align-items:center;gap:26px;padding:60px 44px 28px;background:linear-gradient(transparent,#05131fed)}
    #ending-film button{font:inherit;color:inherit;background:#17303b;border:1px solid #b8ac8d;border-radius:8px;padding:14px 26px;cursor:pointer}
    #ending-film button:focus-visible,#ending-film input:focus-visible{outline:4px solid #f2d99f;outline-offset:5px}
    #ending-film input{accent-color:#e8d7b4;height:40px;cursor:pointer}
    #ending-film .film-progress{flex:1;min-width:120px} #ending-film .film-volume{width:180px}
    #ending-film .film-message{position:absolute;left:25%;right:25%;top:40%;text-align:center;padding:30px;background:#071c27eb;border-radius:12px}
    #ending-film .film-message[hidden]{display:none} #ending-film .film-message p{margin:0 0 25px}
  </style>
  <video playsinline preload="none" aria-label="想要变成鹰的鱼 · 结尾视频 v10"></video>
  <p class="film-heading">故事结尾 · 完整视频 <small>（含后续剧情）</small></p>
  <div class="film-message" role="status"><p></p><button type="button">点击播放</button></div>
  <div class="film-controls">
    <button type="button" class="film-toggle">暂停</button>
    <input class="film-progress" type="range" min="0" max="1000" value="0" step="1" aria-label="视频进度">
    <span class="film-time">0:00 / 4:57</span>
    <label>音量 <input class="film-volume" type="range" min="0" max="100" step="1" aria-label="视频音量"></label>
    <button type="button" class="film-skip">跳过并返回首页</button>
  </div>`;
  const video = panel.querySelector('video');
  const message = panel.querySelector('.film-message');
  const status = message.querySelector('p');
  const retry = message.querySelector('button');
  const toggle = panel.querySelector('.film-toggle');
  const seek = panel.querySelector('.film-progress');
  const gain = panel.querySelector('.film-volume');
  const skip = panel.querySelector('.film-skip');
  const clock = panel.querySelector('.film-time');
  skip.textContent = closeText;
  const siblings = [...mount.children].map(node => ({node, inert:node.inert}));
  siblings.forEach(({node}) => { node.inert = true; });
  mount.append(panel);
  video.volume = Math.max(0, Math.min(1, Number(volume) || 0));
  gain.value = String(Math.round(video.volume * 100));
  const format = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2,'0')}`;
  const cancelTimer = () => { clearTimeout(timer); timer = 0; };
  const show = (text, action) => {
    if (closed) return;
    message.hidden = false; status.textContent = text; retry.textContent = action || '重试'; retry.hidden = !action;
  };
  const hide = () => { message.hidden = true; cancelTimer(); };
  const waitForPlayback = () => {
    if (closed) return;
    cancelTimer();
    show('正在加载视频…', null);
    timer = setTimeout(() => show('加载较慢，可以重试或跳过视频。', '重试'), 15000);
  };
  const failed = () => { cancelTimer(); show('视频加载失败，可以重试或跳过。', '重试'); };
  const play = () => {
    if (closed) return;
    const serial = ++attempt;
    waitForPlayback();
    try {
      Promise.resolve(video.play()).then(() => { if (!closed && serial === attempt) hide(); }).catch(error => {
        if (closed || serial !== attempt) return;
        cancelTimer();
        if (error?.name === 'NotAllowedError') show('点击播放，继续观看结尾视频。', '点击播放');
        else failed();
      });
    } catch { failed(); }
  };
  const close = (notify = true) => {
    if (closed) return;
    closed = true; attempt++; cancelTimer();
    document.removeEventListener('keydown', keys, true);
    document.removeEventListener('keyup', keys, true);
    window.removeEventListener('pagehide', pagehide);
    video.onended = video.onerror = video.onwaiting = video.onplaying = null;
    video.pause(); video.removeAttribute('src'); video.load(); panel.remove();
    siblings.forEach(({node, inert}) => { node.inert = inert; });
    haltModes();
    if (notify) onClose();
    // Give the ending command time to mount the title BGM before releasing it.
    setTimeout(releaseAudio, 0);
    requestAnimationFrame(() => {
      const target = oldFocus?.isConnected && oldFocus !== document.body ? oldFocus : document.getElementById('ending-replay');
      target?.focus({preventScroll:true});
    });
  };
  const keys = event => {
    event.stopImmediatePropagation();
    if (event.key === 'Escape') { event.preventDefault(); if (event.type === 'keydown') close(); return; }
    if (event.key === 'Tab') {
      event.preventDefault();
      if (event.type !== 'keydown') return;
      const items = [...panel.querySelectorAll('button,input')].filter(el => !el.hidden && !el.closest('[hidden]'));
      const i = items.indexOf(document.activeElement);
      items[(i + (event.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
      return;
    }
    if (!panel.contains(event.target) || !['BUTTON','INPUT'].includes(event.target.tagName)) event.preventDefault();
  };
  const pagehide = () => close(false);
  document.addEventListener('keydown', keys, true);
  document.addEventListener('keyup', keys, true);
  window.addEventListener('pagehide', pagehide);
  for (const type of ['click','dblclick','pointerdown','pointerup','contextmenu','wheel']) panel.addEventListener(type, e => e.stopPropagation());
  retry.onclick = () => { if (retry.textContent === '重试') { attempt++; video.load(); } play(); };
  toggle.onclick = () => { if (video.paused) play(); else { attempt++; video.pause(); hide(); } };
  skip.onclick = () => close();
  gain.oninput = () => { video.volume = Number(gain.value) / 100; video.muted = false; };
  seek.oninput = () => { if (Number.isFinite(video.duration)) video.currentTime = Number(seek.value) / 1000 * video.duration; };
  video.onplay = () => { toggle.textContent = '暂停'; };
  video.onpause = () => { toggle.textContent = '播放'; };
  video.ontimeupdate = () => {
    if (Number.isFinite(video.duration)) {
      seek.value = String(Math.round(video.currentTime / video.duration * 1000));
      clock.textContent = `${format(video.currentTime)} / ${format(video.duration)}`;
    }
  };
  video.onended = () => { if (closed) return; onComplete(); close(); }; video.onerror = failed;
  video.onwaiting = waitForPlayback; video.onplaying = hide;
  video.src = src;
  skip.focus({preventScroll:true}); play();
  return {dispose: () => close(false)};
}
