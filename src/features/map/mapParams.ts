import { isDateString } from '@/domain/format';
import { GRADES, HAZARDS, STATUS_FLOW } from '@/domain/labels';
import { DEFAULT_FILTERS, type RecordFilters } from '@/domain/records';

/**
 * 지도·목록 화면 상태는 URL 쿼리에 둔다 (새로고침·공유·뒤로가기에 그대로 남도록).
 *   ?date=2026-09-27&grade=danger&hazard=nest&status=new&sort=priority&sel=<기록 ID>
 * 잘못된 값은 조용히 기본값으로 돌린다.
 */
export interface MapParams {
  date: string;
  filters: RecordFilters;
  selectedId: string | null;
}

const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export function parseMapParams(search: URLSearchParams, today: string): MapParams {
  const date = search.get('date');
  return {
    date: date && isDateString(date) ? date : today,
    filters: {
      grade: pick(search.get('grade'), ['all', ...GRADES], DEFAULT_FILTERS.grade),
      hazard: pick(search.get('hazard'), ['all', ...HAZARDS], DEFAULT_FILTERS.hazard),
      status: pick(search.get('status'), ['all', ...STATUS_FLOW], DEFAULT_FILTERS.status),
      sort: pick(search.get('sort'), ['time', 'priority'], DEFAULT_FILTERS.sort),
    },
    selectedId: search.get('sel') || null,
  };
}

/** 기본값과 같은 항목은 URL에서 뺀다. 날짜는 오늘이 아니면 남긴다. */
export function serializeMapParams(params: MapParams, today: string): URLSearchParams {
  const out = new URLSearchParams();
  if (params.date !== today) out.set('date', params.date);
  for (const key of ['grade', 'hazard', 'status', 'sort'] as const) {
    if (params.filters[key] !== DEFAULT_FILTERS[key]) out.set(key, params.filters[key]);
  }
  if (params.selectedId) out.set('sel', params.selectedId);
  return out;
}
