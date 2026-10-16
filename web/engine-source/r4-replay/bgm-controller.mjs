/** MPL-2.0. Private local extension of the shipped R4 single-element controller.
 * Suspension freezes the existing envelope and its completion callback. It is
 * distinct from the user's pause intent; leases are nested and idempotent.
 */
export const opLocalBgmControllers = new WeakMap();
export const opLocalTransientAudio = new Set();
export function createR4BgmController(audio, commitStopped) {
  let revision = 0, frame = 0, disposed = false, userPaused = false;
  let ownedPaused = false, latest = null, envelope = null, pendingPlay = null;
  let playSerial = 0, held = null, updateWhileHeld = false;
  const leases = new Set();
  const absolute = src => src ? new URL(src, document.baseURI).href : '';
  const source = () => audio.getAttribute('src') ? audio.src : '';
  const clamp = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const cancel = () => {
    revision++; playSerial++;
    if (frame) cancelAnimationFrame(frame);
    frame = 0; envelope = null; pendingPlay = null;
    return revision;
  };
  const pauseOwned = () => { ownedPaused = true; if (!audio.paused) audio.pause(); };
  const runEnvelope = () => {
    const ramp = envelope;
    if (!ramp || disposed || leases.size || ramp.token !== revision) return;
    ramp.began = performance.now() - ramp.elapsed;
    const tick = now => {
      if (disposed || leases.size || envelope !== ramp || ramp.token !== revision) return;
      ramp.elapsed = Math.min(ramp.duration, Math.max(0, now - ramp.began));
      const progress = ramp.duration ? ramp.elapsed / ramp.duration : 1;
      const eased = progress * progress * (3 - 2 * progress);
      audio.volume = clamp(ramp.start + (ramp.target - ramp.start) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else { frame = 0; envelope = null; if (ramp.complete) ramp.complete(); }
    };
    frame = requestAnimationFrame(tick);
  };
  const ramp = (target, duration, token, complete) => {
    if (disposed || token !== revision) return;
    const start = clamp(audio.volume);
    if (duration <= 0 || Math.abs(start - target) < .0001) {
      audio.volume = target; if (complete) complete(); return;
    }
    envelope = { start, target, duration, token, complete, elapsed: 0, began: 0 };
    runEnvelope();
  };
  const assign = desired => {
    if (source() === desired) return;
    pauseOwned(); audio.volume = 0;
    if (desired) audio.src = desired;
    else { audio.removeAttribute('src'); audio.load(); }
  };
  const playAndRamp = (target, duration, token, desired) => {
    if (disposed || token !== revision || userPaused) return;
    pendingPlay = { target, duration, token, desired };
    if (leases.size) return;
    const serial = ++playSerial;
    let promise;
    try { ownedPaused = false; promise = audio.play(); } catch { pendingPlay = null; return; }
    Promise.resolve(promise).then(() => {
      if (disposed || serial !== playSerial || token !== revision || leases.size || userPaused || source() !== desired) return;
      pendingPlay = null;
      ramp(target, target === 0 ? 0 : duration, token);
    }).catch(() => { if (serial === playSerial) pendingPlay = null; });
  };
  function update(options) {
    if (disposed) return;
    latest = { ...options };
    // Changes to settings/source remain pending until the last suspension ends.
    // In particular, a stop-fade must not commitStopped() while the OP is open.
    if (leases.size) { updateWhileHeld = true; return; }
    const token = cancel(), desired = absolute(options.src);
    const target = clamp(options.targetVolume), enter = Number(options.enter) || 0;
    const stopping = !options.isTitle && enter < 0;
    if (target === 0) audio.volume = 0;
    if (!options.enabled) { pauseOwned(); audio.volume = 0; assign(desired); return; }
    if (!desired || stopping) {
      ramp(0, target === 0 ? 0 : (stopping ? Math.abs(enter) : 200), token, () => {
        if (token !== revision || disposed) return;
        assign(''); if (stopping) commitStopped();
      });
      return;
    }
    if (userPaused) { assign(desired); return; }
    if (source() === desired) { playAndRamp(target, 240, token, desired); return; }
    const fadeIn = options.isTitle ? 400 : Math.max(300, Math.min(600, enter || 400));
    const switchSource = () => {
      if (disposed || token !== revision || userPaused) return;
      assign(desired); playAndRamp(target, fadeIn, token, desired);
    };
    ramp(0, source() && !audio.paused && target !== 0 ? 200 : 0, token, switchSource);
  }
  function suspend(owner) {
    if (disposed) return () => {};
    const lease = { owner };
    if (!leases.size) {
      // A pause() immediately preceding this call may not have emitted yet.
      if (audio.paused && !ownedPaused && !pendingPlay && latest?.enabled && !audio.ended) userPaused = true;
      held = { volume: audio.volume, resume: !audio.paused || !!pendingPlay, source: source() };
      if (frame) cancelAnimationFrame(frame);
      frame = 0; playSerial++; updateWhileHeld = false;
    }
    leases.add(lease);
    pauseOwned(); audio.volume = 0;
    let released = false;
    return () => {
      if (released) return;
      released = true; leases.delete(lease);
      if (disposed || leases.size) return;
      const previous = held; held = null;
      audio.volume = previous.volume;
      if (updateWhileHeld) { updateWhileHeld = false; update(latest); return; }
      if (userPaused || source() !== previous.source) return;
      if (pendingPlay) {
        const p = pendingPlay; playAndRamp(p.target, p.duration, p.token, p.desired); return;
      }
      if (!previous.resume) { runEnvelope(); return; }
      const token = revision, serial = ++playSerial;
      try {
        ownedPaused = false;
        Promise.resolve(audio.play()).then(() => {
          if (!disposed && !leases.size && !userPaused && token === revision && serial === playSerial) runEnvelope();
        }).catch(() => {});
      } catch {}
    };
  }
  const onPause = () => {
    if (!disposed && !leases.size && latest?.enabled && audio.paused && !ownedPaused && !audio.ended) {
      userPaused = true; cancel();
    }
  };
  const onPlay = () => {
    if (disposed) return;
    if (leases.size) { pauseOwned(); return; }
    if (userPaused) { userPaused = false; if (latest) update(latest); }
  };
  const onVolume = () => { if (leases.size && audio.volume !== 0) audio.volume = 0; };
  audio.addEventListener('pause', onPause);
  audio.addEventListener('play', onPlay);
  audio.addEventListener('volumechange', onVolume);
  const controller = {
    update, suspend,
    dispose() {
      disposed = true; cancel(); leases.clear(); held = null;
      audio.removeEventListener('pause', onPause); audio.removeEventListener('play', onPlay);
      audio.removeEventListener('volumechange', onVolume);
      opLocalBgmControllers.delete(audio); pauseOwned();
    }
  };
  opLocalBgmControllers.set(audio, controller);
  return controller;
}
