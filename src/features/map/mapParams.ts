import { isDateString } from '@/domain/format';
import { GRADES, HAZARDS, STATUS_FLOW } from '@/domain/labels';
import type { Grade } from '@/domain/types';
import { DEFAULT_FILTERS, type RecordFilters } from '@/domain/records';

/**
 * 지도·목록 화면 상태는 URL 쿼리에 둔다 (새로고침·공유·뒤로가기에 그대로 남도록).
 *   ?date=2026-09-27&grade=danger,warn&hazard=nest&status=new&sort=priority&sel=<기록 ID>
 * grade: 체크한 등급 목록. 전부면 생략, 하나도 없으면 grade=none.
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
      grades: parseGrades(search.get('grade')),
      hazard: pick(search.get('hazard'), ['all', ...HAZARDS], DEFAULT_FILTERS.hazard),
      status: pick(search.get('status'), ['all', ...STATUS_FLOW], DEFAULT_FILTERS.status),
      sort: pick(search.get('sort'), ['time', 'priority'], DEFAULT_FILTERS.sort),
    },
    selectedId: search.get('sel') || null,
  };
}

function parseGrades(raw: string | null): readonly Grade[] {
  if (raw === null) return DEFAULT_FILTERS.grades;
  if (raw === 'none') return [];
  const picked = raw.split(',').filter((g): g is Grade => (GRADES as readonly string[]).includes(g));
  // 알 수 없는 값뿐이면 기본(전부)으로
  return picked.length ? GRADES.filter((g) => picked.includes(g)) : DEFAULT_FILTERS.grades;
}

/** 기본값과 같은 항목은 URL에서 뺀다. 날짜는 오늘이 아니면 남긴다. */
export function serializeMapParams(params: MapParams, today: string): URLSearchParams {
  const out = new URLSearchParams();
  if (params.date !== today) out.set('date', params.date);
  const grades = params.filters.grades;
  if (grades.length === 0) out.set('grade', 'none');
  else if (grades.length < GRADES.length) out.set('grade', GRADES.filter((g) => grades.includes(g)).join(','));
  for (const key of ['hazard', 'status', 'sort'] as const) {
    if (params.filters[key] !== DEFAULT_FILTERS[key]) out.set(key, params.filters[key]);
  }
  if (params.selectedId) out.set('sel', params.selectedId);
  return out;
}
