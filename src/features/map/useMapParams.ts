import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { today } from '@/domain/format';
import { DEFAULT_FILTERS, type RecordFilters } from '@/domain/records';
import { parseMapParams, serializeMapParams, type MapParams } from './mapParams';

export function useMapParams() {
  const [search, setSearch] = useSearchParams();
  const now = today();
  const params = useMemo(() => parseMapParams(search, now), [search, now]);

  const update = useCallback(
    (patch: Partial<MapParams>, opts: { replace?: boolean } = {}) => {
      setSearch((prev) => serializeMapParams({ ...parseMapParams(prev, now), ...patch }, now), {
        replace: opts.replace ?? true,
      });
    },
    [setSearch, now],
  );

  return {
    ...params,
    /** 날짜를 바꾸면 선택은 풀린다. 뒤로 가기로 이전 날짜에 돌아갈 수 있게 히스토리를 남긴다. */
    setDate: (date: string) => update({ date, selectedId: null }, { replace: false }),
    setFilters: (patch: Partial<RecordFilters>) => update({ filters: { ...params.filters, ...patch } }),
    resetFilters: () => update({ filters: { ...DEFAULT_FILTERS, sort: params.filters.sort } }),
    select: (selectedId: string | null) => update({ selectedId }),
  };
}
