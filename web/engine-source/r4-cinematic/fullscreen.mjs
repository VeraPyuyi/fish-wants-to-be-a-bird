/** MPL-2.0. Call from a real user gesture; unsupported/denied requests are harmless. */
export async function enterGameFullscreen(element = document.documentElement) {
  if (document.fullscreenElement || document.webkitFullscreenElement) return;
  const request = element.requestFullscreen || element.webkitRequestFullscreen;
  if (!request) return;
  try { await request.call(element); } catch { /* The game still fills the viewport. */ }
}
export async function exitGameFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (!exit) return;
  try { await exit.call(document); } catch { /* Keep the existing display mode. */ }
}
