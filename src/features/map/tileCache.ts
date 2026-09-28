import { config } from '@/config';

/**
 * 타일 캐시 서비스 워커 등록 (public/tile-sw.js).
 * 서비스 워커를 못 쓰는 환경(http 비보안 origin 등)에서는 조용히 건너뛴다 — 브라우저 HTTP 캐시만 쓴다.
 */
export function registerTileCache(): void {
  if (!config.map.cacheTiles || !('serviceWorker' in navigator)) return;
  const host = new URL(config.map.tileUrl.replace('{s}', 'a')).hostname.replace(/^a\./, '');
  const url = new URL(`tile-sw.js?host=${encodeURIComponent(host)}`, document.baseURI);
  navigator.serviceWorker.register(url, { scope: './' }).catch(() => {
    // 캐시는 부가 기능이라 실패해도 지도는 동작한다.
  });
}
