// VTuber WebAR - サービスワーカー

const CACHE_NAME = 'vtuber-ar-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/assets/images/marker.png',
  '/assets/images/icon-192.png',
  '/assets/images/icon-512.png',
  '/assets/images/ogp.png',
  'https://aframe.io/releases/1.4.0/aframe.min.js',
  'https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js',
  'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;700&display=swap'
];

// インストール時のキャッシュ
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// 古いキャッシュの削除
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// リクエストのハンドリング（キャッシュファーストの戦略）
self.addEventListener('fetch', event => {
  console.log('[Service Worker] Fetch:', event.request.url);
  
  // Googleドライブの動画はキャッシュしない
  if (event.request.url.includes('drive.google.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // キャッシュがあればそれを返す
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // キャッシュがなければネットワークリクエスト
        return fetch(event.request)
          .then(response => {
            // レスポンスをクローンしてキャッシュに保存
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch failed:', error);
            // オフラインフォールバックを提供する場合はここに追加
          });
      })
  );
});