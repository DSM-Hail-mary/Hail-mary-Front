import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { today } from '@/domain/format';
import { DEFAULT_FILTERS, type RecordFilters } from '@/domain/records';
import { parseMapParams, serializeMapParams, type MapParams } from './mapParams';

export function useMapParams() {
  const [search, setSearch] = useSearchParams();
  const now = today();
  const params = useMemo(() => parseMapParams(search, now), [search, now]);

  /**
   * URL 갱신. 바로 앞 변경이 아직 화면에 반영되기 전에 또 바뀔 수 있으므로(필터를 연달아 바꿀 때 등)
   * 라우터가 넘겨주는 값이 아니라 주소창의 최신 쿼리를 읽어 그 위에 덮어쓴다.
   */
  const update = useCallback(
    (patch: Partial<MapParams> | ((current: MapParams) => Partial<MapParams>), opts: { replace?: boolean } = {}) => {
      const latest = parseMapParams(new URLSearchParams(window.location.hash.split('?')[1] ?? ''), now);
      const next = { ...latest, ...(typeof patch === 'function' ? patch(latest) : patch) };
      setSearch(serializeMapParams(next, now), { replace: opts.replace ?? true });
    },
    [setSearch, now],
  );

  // 지도 마커가 memo로 다시 그려지지 않게, 선택 함수는 참조가 바뀌지 않도록 둔다.
  const select = useCallback((selectedId: string | null) => update({ selectedId }), [update]);

  return {
    ...params,
    /** 날짜를 바꾸면 선택은 풀린다. 뒤로 가기로 이전 날짜에 돌아갈 수 있게 히스토리를 남긴다. */
    setDate: (date: string) => update({ date, selectedId: null }, { replace: false }),
    setFilters: (patch: Partial<RecordFilters>) => update((cur) => ({ filters: { ...cur.filters, ...patch } })),
    resetFilters: () => update((cur) => ({ filters: { ...DEFAULT_FILTERS, sort: cur.filters.sort } })),
    select,
  };
}
