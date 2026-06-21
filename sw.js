/* Neon Arcade service worker — cache-first offline support */
const CACHE = 'neon-arcade-v11';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './shared/audio.js',
  './shared/leaderboard.js',
  './vendor/phaser.min.js',
  './vendor/three.module.js',
  './vendor/jsm/loaders/GLTFLoader.js',
  './vendor/jsm/utils/BufferGeometryUtils.js',
  './vendor/cars/race.glb',
  './vendor/cars/race-future.glb',
  './vendor/cars/sedan-sports.glb',
  './vendor/cars/hatchback-sports.glb',
  './vendor/cars/police.glb',
  './vendor/cars/suv-luxury.glb',
  './vendor/cars/taxi.glb',
  './vendor/cars/Textures/colormap.png',
  './vendor/music/rush-nightdrive.mp3',
  './vendor/music/drift-running.mp3',
  './games/drift/index.html',
  './games/rush/index.html',
  './games/pong/index.html',
  './games/pacman/index.html',
  './games/striker/index.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
