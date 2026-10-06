/**
 * sw.js —— Service Worker（离线缓存层）
 * 安装时预缓存应用全部静态资源（页面、脚本、样式、sql.js 运行时、题库、图标），
 * 使站点以 PWA 安装后可完全离线运行。
 * 缓存版本随应用版本更新：新版本激活时自动清理旧缓存。
 */
const CACHE_VERSION = 'kids-keywords-v1.0.7';

/** 首次安装即预缓存的核心资源（路径相对本文件，即站点根目录） */
const CORE_ASSETS = [
  './',
  './index.html',
  './practice.html',
  './history.html',
  './help.html',
  './data.html',
  './manifest.webmanifest',
  './sw.js',
  './app/pwa.js',
  './app/style.css',
  './app/data-maintain.js',
  './app/db.js',
  './app/dictation.js',
  './app/history.js',
  './app/home.js',
  './app/multiselect.js',
  './app/practice.js',
  './app/store.js',
  './app/typing.js',
  './app/xlsx-io.js',
  './dist/vkeyboardhand.css',
  './dist/vkeyboardhand.umd.js',
  './dist/vkeyboardhand.esm.mjs',
  './vendor/sql-wasm-browser.js',
  './vendor/sql-wasm-browser.wasm',
  './vendor/xlsx.full.min.js',
  './data/vocabulary.sqlite',
  './svg/keyboard.svg',
  './svg/hand.svg',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      await cache.addAll(CORE_ASSETS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先并回写缓存，离线时回退缓存（再退到首页）
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            const cache = await caches.open(CACHE_VERSION);
            cache.put(request, fresh.clone());
          }
          return fresh;
        } catch {
          const cached = await caches.match(request);
          return cached || (await caches.match('./index.html'));
        }
      })()
    );
    return;
  }

  // 其他静态资源：缓存优先，同时后台用网络响应刷新缓存
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })()
  );
});
