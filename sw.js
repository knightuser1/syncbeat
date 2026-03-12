// SyncBeat Service Worker
// Handles offline caching and background sync

const CACHE_NAME = 'syncbeat-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// ── Install: cache the shell ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => clients.claim())
  );
});

// ── Fetch: network first, cache fallback ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // For navigation requests (loading the app)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Update cache with fresh copy
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() =>
          caches.match('/index.html').then(cached => cached || offlinePage())
        )
    );
    return;
  }

  // For CDN assets (fonts, PeerJS) — cache then network
  if (url.hostname !== location.hostname) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        }).catch(() => cached);
      })
    );
  }
});

function offlinePage() {
  return new Response(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SyncBeat — Offline</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background:#0c0c10; color:#f0f0f8;
      font-family:system-ui,sans-serif;
      display:flex; align-items:center; justify-content:center;
      min-height:100vh; text-align:center; padding:24px;
    }
    .wrap { display:flex; flex-direction:column; align-items:center; gap:18px; }
    .icon { font-size:4.5rem; }
    h1 { font-size:1.6rem; font-weight:800;
         background:linear-gradient(135deg,#8b5cf6,#ff4d72);
         -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
    p { color:#9898b8; font-size:0.85rem; line-height:1.7; max-width:300px; }
    .dots { display:flex; gap:8px; }
    .dot {
      width:10px; height:10px; border-radius:50%; background:#8b5cf6;
      animation: bounce 1.4s ease-in-out infinite;
    }
    .dot:nth-child(2) { animation-delay:.2s; background:#ff4d72; }
    .dot:nth-child(3) { animation-delay:.4s; background:#f5c842; }
    @keyframes bounce {
      0%,80%,100% { transform:scale(0.6); opacity:0.4; }
      40% { transform:scale(1); opacity:1; }
    }
    button {
      padding:12px 28px; border-radius:99px; border:none; cursor:pointer;
      background:linear-gradient(135deg,#8b5cf6,#ff4d72);
      color:#fff; font-weight:800; font-size:0.9rem;
      box-shadow:0 4px 20px rgba(139,92,246,0.4);
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="icon">🎵</div>
    <h1>SyncBeat</h1>
    <p>You're offline. Connect to the internet to listen with your friends in sync.</p>
    <div class="dots">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
    <button onclick="location.reload()">Try Again</button>
  </div>
</body>
</html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}
