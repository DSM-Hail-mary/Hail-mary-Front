import { config } from '@/config';

/**
 * 지도 배경 레이어 정의. 화면은 이 목록만 보고 그린다 — 타일 제공처를 바꿀 때는 여기만 고친다.
 */
export type BaseLayerId = 'night' | 'mono' | 'color' | 'satellite';

export interface TileSpec {
  url: string;
  attribution: string;
  /** 타일 서버가 실제로 가진 최대 줌. 그 이상은 확대해서 보여 준다. */
  maxNativeZoom: number;
  /** 밝은 타일을 CSS 필터로 어둡게 (다크 테마에 맞추기). */
  darken: boolean;
}

export interface BaseLayer {
  id: BaseLayerId;
  label: string;
  /** 아래부터 차례로 겹친다 (예: 위성 영상 + 도로명). */
  tiles: TileSpec[];
}

const VWORLD_ATTRIBUTION =
  '&copy; <a href="https://www.vworld.kr" target="_blank" rel="noreferrer">VWorld</a> (국토교통부)';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** VWorld WMTS: https://api.vworld.kr/req/wmts/1.0.0/{키}/{레이어}/{z}/{y}/{x}.{확장자} */
function vworld(
  key: string,
  layer: 'midnight' | 'white' | 'Base' | 'Satellite' | 'Hybrid',
  ext: 'png' | 'jpeg',
): TileSpec {
  return {
    url: `https://api.vworld.kr/req/wmts/1.0.0/${encodeURIComponent(key)}/${layer}/{z}/{y}/{x}.${ext}`,
    attribution: VWORLD_ATTRIBUTION,
    maxNativeZoom: 19,
    darken: false,
  };
}

export function getBaseLayers(): BaseLayer[] {
  const { customTileUrl, customAttribution, vworldKey, darkenOverride } = config.map;

  if (customTileUrl) {
    return [
      {
        id: 'night',
        label: '기본',
        tiles: [
          {
            url: customTileUrl,
            attribution: customAttribution || OSM_ATTRIBUTION,
            maxNativeZoom: 19,
            darken: darkenOverride ?? false,
          },
        ],
      },
    ];
  }

  if (vworldKey) {
    return [
      // 야간: 처음부터 어두워서 필터가 필요 없다 (기본)
      {
        id: 'night',
        label: '야간',
        tiles: [{ ...vworld(vworldKey, 'midnight', 'png'), darken: darkenOverride ?? false }],
      },
      // 흑백: 건물·등고선 없이 도로 윤곽만. 밝은 회색 지도를 반전해 다크 화면에 맞춘다
      { id: 'mono', label: '흑백', tiles: [{ ...vworld(vworldKey, 'white', 'png'), darken: true }] },
      // 컬러: 건물·등고선·지명이 모두 나오는 일반 지도
      { id: 'color', label: '컬러', tiles: [vworld(vworldKey, 'Base', 'png')] },
      // 위성: 컬러 위성 영상 + 도로명·지명 겹침 (현장 대조용)
      {
        id: 'satellite',
        label: '위성',
        tiles: [vworld(vworldKey, 'Satellite', 'jpeg'), vworld(vworldKey, 'Hybrid', 'png')],
      },
    ];
  }

  return [
    {
      id: 'mono',
      label: '흑백',
      tiles: [
        {
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: OSM_ATTRIBUTION,
          maxNativeZoom: 19,
          darken: darkenOverride ?? true,
        },
      ],
    },
  ];
}

/** 타일 캐시(서비스 워커)가 가로챌 호스트 목록. */
export function tileHosts(layers: readonly BaseLayer[]): string[] {
  const hosts = layers.flatMap((l) =>
    l.tiles.map((t) => new URL(t.url.replace('{s}', 'a')).hostname.replace(/^a\./, '')),
  );
  return [...new Set(hosts)];
}
