/** 빌드 시 환경 변수(`.env`, `.env.example` 참고)를 한곳에서 읽는다. */

const env = import.meta.env;

export const config = {
  apiMode: (env.VITE_API_MODE === 'http' ? 'http' : 'mock') as 'http' | 'mock',
  apiBase: env.VITE_API_BASE ?? '',
  /**
   * 기기 상태만 따로 받을 서버 주소 (예: http://127.0.0.1:8000). 있으면 다른 화면의 데이터 모드와 관계없이
   * 기기 상태는 이 서버의 GET /api/device/session/latest 에서 받는다. 서버 API가 화면별로 준비되는 동안 쓴다.
   */
  deviceApiBase: env.VITE_DEVICE_API_BASE?.trim() ?? '',
  /** mock 모드에서 테스트용 예시 데이터(가짜 전주 13개 등)를 쓸지. 기본 false = 빈 상태. */
  mockSampleData: env.VITE_MOCK_SAMPLE_DATA === 'true',
  mockSync: (['done', 'syncing', 'failed'] as const).find((m) => m === env.VITE_MOCK_SYNC) ?? 'done',
  map: {
    /** 주행 경로가 없을 때 지도 위치: 남한 전체. */
    defaultCenter: [36.35, 127.8] as [number, number],
    defaultZoom: 7,
    /**
     * 배경지도 선택 순서 (src/features/map/baseLayers.ts):
     * 1) VITE_MAP_TILE_URL 이 있으면 그 타일 하나
     * 2) VITE_VWORLD_KEY 가 있으면 VWorld 야간 지도 + 위성 영상
     * 3) 둘 다 없으면 OpenStreetMap 표준 타일을 CSS 필터로 어둡게
     */
    vworldKey: env.VITE_VWORLD_KEY?.trim() ?? '',
    customTileUrl: env.VITE_MAP_TILE_URL ?? '',
    customAttribution: env.VITE_MAP_TILE_ATTRIBUTION ?? '',
    /** 밝은 타일을 무채색 다크로 바꾸는 필터를 강제로 켜고/끈다. 비우면 타일 종류에 맞춰 자동. */
    darkenOverride: env.VITE_MAP_TILE_DARKEN ? env.VITE_MAP_TILE_DARKEN !== 'false' : null,
    /** 타일을 서비스 워커로 7일간 캐시 (public/tile-sw.js). 반복 요청을 줄이고, 서버가 막혀도 본 적 있는 지역은 보인다. */
    cacheTiles: env.VITE_MAP_TILE_CACHE !== 'false',
    /**
     * 화면 밖으로 미리 받아 둘 타일 줄 수 (Leaflet 기본 2).
     * 3으로 조금만 늘렸다 — 드래그 시 빈칸이 줄고, 요청 증가는 캐시로 상쇄된다. 더 늘리면 공개 서버 제한에 걸릴 수 있다.
     */
    keepBuffer: 3,
  },
  /** 상단 바 동기화 상태를 다시 묻는 간격. */
  syncPollMs: 5000,
  /** 목록 한 페이지 행 수. */
  listPageSize: 50,
} as const;
