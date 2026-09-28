/*
 * 지도 타일 캐시 (서비스 워커).
 * - 한 번 받은 타일은 7일 동안 타일 서버에 다시 묻지 않는다 → 공개 타일 서버 요청 수를 줄인다.
 * - 타일 서버가 막히거나(요청 제한) 네트워크가 끊겨도 이미 받은 타일은 오래된 것이라도 보여 준다.
 * - 캐시는 최대 MAX_ENTRIES장, 넘으면 오래된 것부터 지운다.
 * 대상 호스트는 등록할 때 ?host= 로 넘긴다 (src/map/tileCache.ts).
 */
const HOST = new URL(self.location.href).searchParams.get('host');
const CACHE = 'pw-tiles-v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 3000;
const STAMP = 'x-pw-cached-at';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function isTile(url) {
  // {s}.tile.example.org 같은 서브도메인 분산도 같은 호스트로 본다.
  return HOST && (url.hostname === HOST || url.hostname.endsWith(`.${HOST}`));
}

async function trim(cache) {
  const keys = await cache.keys();
  const extra = keys.length - MAX_ENTRIES;
  for (let i = 0; i < extra; i += 1) await cache.delete(keys[i]);
}

async function fromNetwork(request, cache) {
  const response = await fetch(request);
  if (response.ok) {
    const body = await response.blob();
    const headers = new Headers({ 'Content-Type': response.headers.get('Content-Type') || 'image/png' });
    headers.set(STAMP, String(Date.now()));
    await cache.put(request, new Response(body, { status: 200, headers }));
    if (Math.random() < 0.05) void trim(cache);
    return new Response(body, { status: 200, headers });
  }
  return response;
}

async function handle(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fresh = cached && Date.now() - Number(cached.headers.get(STAMP) || 0) < TTL_MS;
  if (fresh) return cached;
  try {
    const response = await fromNetwork(request, cache);
    // 서버가 거절(429/403 등)하면 오래된 캐시라도 준다.
    if (!response.ok && cached) return cached;
    return response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !isTile(url)) return;
  event.respondWith(handle(event.request));
});
