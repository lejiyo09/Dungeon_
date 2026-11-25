// 서비스 워커: 오프라인 플레이 지원
//  · 설치 시 index.html과 그 안의 모든 스크립트, 매니페스트, 아이콘을 저장
//  · 실행 중에는 '네트워크 우선': 온라인이면 항상 최신 버전을 받아 저장하고, 오프라인이면 저장본으로 실행
const CACHE = 'project-dungeon-v2';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    // index.html에 적힌 스크립트 목록을 읽어서 함께 저장 (스크립트를 추가해도 목록을 따로 고칠 필요 없음)
    const html = await (await fetch('./index.html', { cache: 'no-store' })).text();
    const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => './' + m[1]);
    await cache.addAll(scripts);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k); // 예전 버전 정리
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-cache' }); // 브라우저 HTTP 캐시(깃허브 페이지 10분)에 남은 예전 파일 대신 항상 서버에 새 버전 확인 — 파일 일부만 새것이 되어 어긋나는 문제 방지
      if (res && res.ok) { const cache = await caches.open(CACHE); cache.put(req, res.clone()); }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return caches.match('./index.html');
      throw err;
    }
  })());
});
