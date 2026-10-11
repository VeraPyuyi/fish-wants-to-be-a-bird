/** R4: one native BGM element; no music edits, cross-player overlap or loop rewrite. */
export function createR4BgmController(audio, commitStopped) {
  let revision = 0, frame = 0, disposed = false, userPaused = false;
  let ownedPaused = false, latest = null;
  const absolute = src => src ? new URL(src, document.baseURI).href : '';
  const source = () => audio.getAttribute('src') ? audio.src : '';
  const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const cancel = () => { revision++; if (frame) cancelAnimationFrame(frame); frame = 0; return revision; };
  // Source replacement can discard queued pause events; track intent, not event counts.
  const pauseOwned = () => { ownedPaused = true; if (!audio.paused) audio.pause(); };
  const ramp = (target, duration, token, complete) => {
    if (disposed || token !== revision) return;
    const start = clamp(audio.volume), began = performance.now();
    if (duration <= 0 || Math.abs(start - target) < .0001) {
      audio.volume = target; if (complete) complete(); return;
    }
    const tick = now => {
      if (disposed || token !== revision) return;
      const progress = Math.min(1, Math.max(0, (now - began) / duration));
      // Smooth endpoints avoid a sudden gain slope at either end.
      const eased = progress * progress * (3 - 2 * progress);
      audio.volume = clamp(start + (target - start) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else { frame = 0; if (complete) complete(); }
    };
    frame = requestAnimationFrame(tick);
  };
  const assign = desired => {
    if (source() === desired) return;
    pauseOwned(); audio.volume = 0;
    if (desired) audio.src = desired;
    else { audio.removeAttribute('src'); audio.load(); }
  };
  const playAndRamp = (target, duration, token, desired) => {
    if (disposed || token !== revision || userPaused) return;
    // play() resolves only when playback has started. Never raise a loading track early.
    let promise;
    try { ownedPaused = false; promise = audio.play(); } catch { return; }
    Promise.resolve(promise).then(() => {
      if (disposed || token !== revision || userPaused || source() !== desired) return;
      ramp(target, target === 0 ? 0 : duration, token);
    }).catch(() => {}); // Aborted source switches and browser autoplay denials remain quiet.
  };
  function update(options) {
    if (disposed) return;
    latest = { ...options };
    const token = cancel(), desired = absolute(options.src);
    const target = clamp(options.targetVolume), enter = Number(options.enter) || 0;
    const stopping = !options.isTitle && enter < 0;
    // A user mute always wins immediately, including during an old fade-out.
    if (target === 0) audio.volume = 0;
    if (!options.enabled) { pauseOwned(); audio.volume = 0; assign(desired); return; }
    if (!desired || stopping) {
      ramp(0, target === 0 ? 0 : (stopping ? Math.abs(enter) : 200), token, () => {
        if (token !== revision || disposed) return;
        assign('');
        if (stopping) commitStopped();
      });
      return;
    }
    if (userPaused) { assign(desired); return; }
    const same = source() === desired;
    if (same) {
      // Same cue or a changed volume must not reset currentTime or drop gain to zero.
      playAndRamp(target, 240, token, desired);
      return;
    }
    const fadeIn = options.isTitle ? 400 : Math.max(300, Math.min(600, enter || 400));
    const switchSource = () => {
      if (disposed || token !== revision || userPaused) return;
      assign(desired);
      playAndRamp(target, fadeIn, token, desired);
    };
    // Sequential fades with one element: at no point can two BGM tracks overlap.
    ramp(0, source() && !audio.paused && target !== 0 ? 200 : 0, token, switchSource);
  }
  const onPause = () => {
    if (!disposed && latest?.enabled && audio.paused && !ownedPaused && !audio.ended) {
      userPaused = true; cancel();
    }
  };
  const onPlay = () => {
    if (!disposed && userPaused) { userPaused = false; if (latest) update(latest); }
  };
  audio.addEventListener('pause', onPause);
  audio.addEventListener('play', onPlay);
  return {
    update,
    dispose() {
      disposed = true; cancel();
      audio.removeEventListener('pause', onPause); audio.removeEventListener('play', onPlay);
      pauseOwned();
    }
  };
}
