// Service Worker — офлайн-кэш для свадебного приложения
// При обновлении файлов меняйте версию кэша, чтобы клиенты получили свежую версию.
const CACHE = 'wedding-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  './icon-maskable-512.png'
];

// Установка: кэшируем оболочку приложения
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // addAll может упасть, если иконки отсутствуют — кэшируем по одному «мягко»
      return Promise.all(ASSETS.map(function (url) {
        return c.add(url).catch(function () {});
      }));
    })
  );
  self.skipWaiting();
});

// Активация: удаляем старые версии кэша
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== CACHE;
      }).map(function (k) {
        return caches.delete(k);
      }));
    })
  );
  self.clients.claim();
});

// Запросы: сначала кэш, затем сеть (приложение полностью офлайн)
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  // запросы к GitHub API никогда не кэшируем — всегда сеть
  if (e.request.url.indexOf('api.github.com') !== -1) return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;
      return fetch(e.request).then(function (resp) {
        // кладём в кэш свежие GET-ответы того же origin
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) {
          try { c.put(e.request, copy); } catch (err) {}
        });
        return resp;
      }).catch(function () {
        // офлайн и нет в кэше — отдаём index.html для навигации
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
