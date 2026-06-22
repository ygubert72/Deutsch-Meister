// sw.js — Service Worker для PWA

const VERSION = '20260625';
const CACHE_NAME = 'deutsch-meister-v' + VERSION;

const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/utils.js',
  './js/logger.js',
  './js/containerManager.js',
  './js/carousel.js',
  './js/wordsManager.js',
  './js/sentencesManager.js',
  './js/cardsMode.js',
  './js/quizMode.js',
  './js/sentencesMode.js',
  './js/grammarMode.js',
  './js/app.js',
  './js/auth.js',
  './js/userService.js',
  './js/activityTracker.js',
  './js/adminUI.js',
  './admin.html',
  './manifest.json',
  './icons/icon.svg',
  './icons/16.png',
  './icons/32.png',
  './icons/64.png',
  './icons/72.png',
  './icons/128.png',
  './icons/144.png',
  './icons/192.png',
  './icons/512.png'
];

self.addEventListener('install', function(event) {
  console.log('[SW] Установка... Версия:', VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SW] Кешируем файлы');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(function() {
        console.log('[SW] Кеширование завершено');
        return self.skipWaiting();
      })
      .catch(function(err) {
        console.error('[SW] Ошибка кеширования:', err);
      })
  );
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Активация...');
  event.waitUntil(
    caches.keys()
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function(name) {
              return name !== CACHE_NAME;
            })
            .map(function(name) {
              console.log('[SW] Удаляем старый кеш:', name);
              return caches.delete(name);
            })
        );
      })
      .then(function() {
        console.log('[SW] Service Worker активирован, версия:', VERSION);
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function(event) {
  var request = event.request;
  var url = new URL(request.url);
  
  // Пропускаем Firebase
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Пропускаем API геолокации
  if (url.hostname.includes('ipapi.co')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // ===== ВСЕ ДАННЫЕ (/docs/) — ТОЛЬКО СЕТЬ =====
  if (url.pathname.includes('/docs/')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // ===== JSON ФАЙЛЫ — ТОЛЬКО СЕТЬ =====
  if (url.pathname.endsWith('.json')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // ===== ВСЁ ОСТАЛЬНОЕ — КЕШ + СЕТЬ =====
  event.respondWith(
    caches.match(request)
      .then(function(cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request);
      })
      .catch(function() {
        if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
          return new Response(
            '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Нет соединения</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",sans-serif;background:#F8F8F8;display:flex;justify-content:center;align-items:center;height:100vh;text-align:center;padding:20px}.icon{font-size:64px;margin-bottom:20px}h1{font-size:24px;color:#333;margin-bottom:10px}p{color:#666;font-size:16px;line-height:1.6;margin-bottom:20px}.btn{display:inline-block;padding:12px 30px;background:#3B6FE0;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:bold;cursor:pointer;text-decoration:none}.btn:hover{background:#2B5BC7}.retry-btn{margin-top:10px;background:#4CAF50}.retry-btn:hover{background:#388E3C}</style></head><body><div><div class="icon">📡</div><h1>Нет соединения</h1><p>Проверьте подключение к интернету<br>и попробуйте снова.</p><button class="btn retry-btn" onclick="location.reload()">🔄 Попробовать снова</button><br><br><a href="./" class="btn" style="background:#666;">🏠 На главную</a></div></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
        return new Response('Нет соединения', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});
