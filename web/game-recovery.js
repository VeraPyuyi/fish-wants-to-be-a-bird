/* Project-local resource failure notice. Retry is always an explicit player action. */
(() => {
  let pending = false;
  function isGameAsset(value) {
    try {
      const url = new URL(value, location.href);
      return url.origin === location.origin && /\/(game|assets)\//.test(url.pathname);
    } catch { return false; }
  }
  function showRecovery() {
    if (!document.body) { pending = true; return; }
    if (document.getElementById('game-recovery')) return;
    const panel = document.createElement('aside');
    panel.id = 'game-recovery'; panel.setAttribute('role', 'alert');
    const message = document.createElement('p');
    message.textContent = '有一份画面或声音未能载入。你可以重新载入页面；游玩中的进度请先快速存档。';
    const retry = document.createElement('button'); retry.textContent = '重新载入';
    retry.onclick = () => location.reload();
    const close = document.createElement('button'); close.textContent = '稍后处理';
    close.onclick = () => panel.remove();
    panel.append(message, retry, close); document.body.append(panel);
  }
  document.addEventListener('DOMContentLoaded', () => { if (pending) showRecovery(); });
  addEventListener('error', event => {
    const target = event.target;
    if (target && isGameAsset(target.currentSrc || target.src || target.href)) showRecovery();
  }, true);
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = args[0] instanceof Request ? args[0].url : args[0];
    try {
      const response = await originalFetch.apply(this, args);
      if (!response.ok && isGameAsset(url)) showRecovery();
      return response;
    } catch (error) {
      if (error.name !== 'AbortError' && isGameAsset(url)) showRecovery();
      throw error;
    }
  };
  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.addEventListener('load', () => { if (this.status >= 400 && isGameAsset(url)) showRecovery(); }, { once: true });
    return open.call(this, method, url, ...rest);
  };
})();
