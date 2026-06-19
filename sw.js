// sw.js — Service Worker для PWA

const CACHE_NAME = 'deutsch-meister-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Файлы, которые кешируем при установке
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/config.js',
  '/js/wordsManager.js',
  '/js/sentencesManager.js',
  '/js/cardsMode.js',
  '/js/quizMode.js',
  '/js/sentencesMode.js',
  '/js/grammarMode.js',
  '/js/app.js',
  '/js/auth.js',
  '/admin.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// ========== УСТАНОВКА ==========
self.addEventListener('install', event => {
  console.log('[SW] Установка...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Кешируем статические файлы');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Кеширование завершено');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Ошибка кеширования:', err);
      })
  );
});

// ========== АКТИВАЦИЯ ==========
self.addEventListener('activate', event => {
  console.log('[SW] Активация...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map(name => {
              console.log('[SW] Удаляем старый кеш:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker активирован');
        return self.clients.claim();
      })
  );
});

// ========== ПЕРЕХВАТ ЗАПРОСОВ ==========
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Пропускаем запросы к Firebase (они и так работают через интернет)
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Пропускаем запросы к API геолокации
  if (url.hostname.includes('ipapi.co')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Стратегия: сначала кеш, потом сеть
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Если есть в кеше — возвращаем
        if (cachedResponse) {
          // Обновляем кеш в фоне (для динамических запросов)
          if (request.method === 'GET') {
            fetch(request)
              .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(DYNAMIC_CACHE)
                    .then(cache => {
                      cache.put(request, networkResponse.clone());
                    });
                }
              })
              .catch(() => {});
          }
          return cachedResponse;
        }
        
        // Если нет в кеше — идём в сеть
        return fetch(request)
          .then(networkResponse => {
            // Кешируем успешные GET-запросы
            if (request.method === 'GET' && networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE)
                .then(cache => {
                  cache.put(request, responseClone);
                });
            }
            return networkResponse;
          })
          .catch(() => {
            // Если нет интернета и нет кеша — показываем офлайн-страницу
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/offline.html');
            }
            return new Response('Нет соединения', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// ========== ОБРАБОТКА PUSH-УВЕДОМЛЕНИЙ ==========
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '🇩🇪 Deutsch-Meister';
  const options = {
    body: data.body || 'Пора повторить слова!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ========== ОБРАБОТКА КЛИКА ПО УВЕДОМЛЕНИЮ ==========
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
