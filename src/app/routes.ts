/** 화면 경로를 만드는 함수 모음. 링크 문자열을 여기저기서 직접 조립하지 않는다. */

function withQuery(path: string, params: Record<string, string | null | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

export const routes = {
  paths: {
    map: '/map',
    poles: '/poles',
    pole: '/poles/:recordId',
    device: '/device',
  },
  /** 지도·목록. `date`는 기준 날짜, `sel`은 선택 기록. */
  map: (params: { date?: string | null; sel?: string | null } = {}) => withQuery('/map', params),
  pole: (recordId: string) => `/poles/${encodeURIComponent(recordId)}`,
  /** 상세 탭 진입점: 마지막으로 본 기록으로 보낸다. */
  poles: () => '/poles',
  device: (params: { drive?: string | null } = {}) => withQuery('/device', params),
};
