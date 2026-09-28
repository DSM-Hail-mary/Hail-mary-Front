/** 빌드 시 환경 변수(`.env`, `.env.example` 참고)를 한곳에서 읽는다. */

const env = import.meta.env;

export const config = {
  apiMode: (env.VITE_API_MODE === 'http' ? 'http' : 'mock') as 'http' | 'mock',
  apiBase: env.VITE_API_BASE ?? '',
  mockSync: (['done', 'syncing', 'failed'] as const).find((m) => m === env.VITE_MOCK_SYNC) ?? 'done',
  map: {
    /** 기록이 없는 날 지도를 둘 위치 (예시 데이터 주행 지역). */
    defaultCenter: [35.02, 126.73] as [number, number],
    defaultZoom: 13,
    // 기본은 OpenStreetMap 표준 타일(키 불필요)을 CSS 필터로 어둡게 뒤집어 쓴다.
    // 트래픽이 많아지면 OSM 타일 이용 정책에 따라 자체/유료 타일 서버로 바꾼다 (VITE_MAP_TILE_URL).
    tileUrl: env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      env.VITE_MAP_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    /** 밝은 타일을 무채색 다크로 바꾸는 필터. 처음부터 어두운 타일을 쓰면 false. */
    /** 타일을 서비스 워커로 7일간 캐시 (public/tile-sw.js). 반복 요청을 줄이고, 서버가 막혀도 본 적 있는 지역은 보인다. */
    cacheTiles: env.VITE_MAP_TILE_CACHE !== 'false',
    /**
     * 화면 밖으로 미리 받아 둘 타일 줄 수 (Leaflet 기본 2).
     * 3으로 조금만 늘렸다 — 드래그 시 빈칸이 줄고, 요청 증가는 캐시로 상쇄된다. 더 늘리면 공개 서버 제한에 걸릴 수 있다.
     */
    keepBuffer: 3,
    darkenTiles: env.VITE_MAP_TILE_DARKEN ? env.VITE_MAP_TILE_DARKEN !== 'false' : !env.VITE_MAP_TILE_URL,
  },
  /** 상단 바 동기화 상태를 다시 묻는 간격. */
  syncPollMs: 5000,
  /** 목록 한 페이지 행 수. */
  listPageSize: 50,
} as const;
