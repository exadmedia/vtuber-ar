// VTuber WebAR - �T�[�r�X���[�J�[

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

// �C���X�g�[�����̃L���b�V��
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

// �Â��L���b�V���̍폜
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

// ���N�G�X�g�̃n���h�����O�i�L���b�V���t�@�[�X�g�̐헪�j
self.addEventListener('fetch', event => {
  console.log('[Service Worker] Fetch:', event.request.url);
  
  // Google�h���C�u�̓���̓L���b�V�����Ȃ�
  if (event.request.url.includes('drive.google.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // �L���b�V��������΂����Ԃ�
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // �L���b�V�����Ȃ���΃l�b�g���[�N���N�G�X�g
        return fetch(event.request)
          .then(response => {
            // ���X�|���X���N���[�����ăL���b�V���ɕۑ�
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
            // �I�t���C���t�H�[���o�b�N��񋟂���ꍇ�͂����ɒǉ�
          });
      })
  );
});