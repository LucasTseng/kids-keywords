/**
 * pwa.js
 * Service Worker 注册模块：在安全上下文（https / localhost / 受信任的自定义协议）
 * 下注册根目录的 sw.js，启用 PWA 离线缓存。注册失败时静默忽略，
 * 不影响 file:// 直开等场景下的正常使用。
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((error) => {
      console.info('Service Worker 未启用：', error);
    });
  });
}
