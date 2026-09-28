import { STATUS_FLOW } from './labels';
import type { Grade, GradeBasis, HazardType, PoleRecord, ProcessStatus } from './types';

type GradeBasisMetric = GradeBasis['metric'];

export type GradeFilter = Grade | 'all';
export type HazardFilter = HazardType | 'all';
export type StatusFilter = ProcessStatus | 'all';
export type SortKey = 'time' | 'priority';

export interface RecordFilters {
  grade: GradeFilter;
  hazard: HazardFilter;
  status: StatusFilter;
  sort: SortKey;
}

export const DEFAULT_FILTERS: RecordFilters = {
  grade: 'all',
  hazard: 'all',
  status: 'all',
  sort: 'time',
};

export function isFalsePositive(record: PoleRecord): boolean {
  return record.review === 'false_positive';
}

export interface GradeCounts {
  total: number;
  danger: number;
  warn: number;
  ok: number;
}

/**
 * 등급별 집계. KPI는 오탐 판정 기록을 뺀다 (명세서 4.3).
 * 목록 세그먼트는 보이는 행 수와 맞추려고 `includeFalsePositives`로 오탐도 센다.
 */
export function countByGrade(
  records: readonly PoleRecord[],
  { includeFalsePositives = false }: { includeFalsePositives?: boolean } = {},
): GradeCounts {
  const counts: GradeCounts = { total: 0, danger: 0, warn: 0, ok: 0 };
  for (const r of records) {
    if (!includeFalsePositives && isFalsePositive(r)) continue;
    counts.total += 1;
    counts[r.grade] += 1;
  }
  return counts;
}

export function matchesFilters(record: PoleRecord, f: RecordFilters): boolean {
  if (f.grade !== 'all' && record.grade !== f.grade) return false;
  if (f.hazard !== 'all' && record.hazard !== f.hazard) return false;
  if (f.status !== 'all' && record.status !== f.status) return false;
  return true;
}

export function hasActiveFilters(f: RecordFilters): boolean {
  return f.grade !== 'all' || f.hazard !== 'all' || f.status !== 'all';
}

const GRADE_WEIGHT: Record<Grade, number> = { danger: 300, warn: 200, ok: 0 };

/**
 * 우선순위 점수 (명세서 3.3 정렬 [선택]): 등급, 재방문 추이, 연속 발견 횟수.
 * 가중치는 임시값이다. 판정 기준이 정해지면 조정한다.
 */
export function priorityScore(record: PoleRecord): number {
  if (isFalsePositive(record)) return -1000;
  let score = GRADE_WEIGHT[record.grade];
  if (basisTrend(record) === 'up') score += 50;
  score += Math.min(record.consecutiveFinds, 5) * 10;
  // 이미 철거된 전주는 뒤로 보낸다.
  if (record.status === 'removed') score -= 250;
  return score;
}

export type BasisTrend = 'up' | 'same' | 'down';

/** 이전 방문 대비 등급 근거 단계 변화. 비교할 수 없으면 `null`. */
export function basisTrend(record: PoleRecord): BasisTrend | null {
  const prev = record.previousVisit?.basis;
  const cur = record.basis;
  if (!prev || !cur || prev.metric !== cur.metric) return null;
  if (cur.level > prev.level) return 'up';
  if (cur.level < prev.level) return 'down';
  return 'same';
}

function byTime(a: PoleRecord, b: PoleRecord): number {
  return Date.parse(a.recordedAt) - Date.parse(b.recordedAt);
}

export function sortRecords(records: readonly PoleRecord[], sort: SortKey): PoleRecord[] {
  const copy = [...records];
  if (sort === 'priority') {
    return copy.sort((a, b) => priorityScore(b) - priorityScore(a) || byTime(a, b));
  }
  return copy.sort(byTime);
}

/** CSV 내보내기 대상 (명세서 4.6): 위험 전주, 오탐 제외, 기록 시각순. */
export function exportableRecords(records: readonly PoleRecord[]): PoleRecord[] {
  return sortRecords(
    records.filter((r) => r.grade === 'danger' && !isFalsePositive(r)),
    'time',
  );
}

/** 목록·지도에 보일 기록 (필터 + 정렬). */
export function applyFilters(records: readonly PoleRecord[], f: RecordFilters): PoleRecord[] {
  return sortRecords(
    records.filter((r) => matchesFilters(r, f)),
    f.sort,
  );
}

/** 요약 카드의 "확인 처리" 토글이 가능한 상태. */
export function canToggleConfirm(status: ProcessStatus | null): status is 'new' | 'checked' {
  return status === 'new' || status === 'checked';
}

/** 신규 ↔ 확인 토글. 그 외 상태는 바꾸지 않는다. */
export function toggleConfirm(status: ProcessStatus | null): ProcessStatus | null {
  if (status === 'new') return 'checked';
  if (status === 'checked') return 'new';
  return status;
}

/** 처리 단계 한 칸 되돌리기. 첫 단계면 그대로. */
export function previousStatus(status: ProcessStatus): ProcessStatus {
  const idx = STATUS_FLOW.indexOf(status);
  return STATUS_FLOW[Math.max(0, idx - 1)] ?? status;
}

export interface QueuePosition {
  /** 대기열 안 위치 (0부터). 현재 기록이 대기열에 없으면 -1. */
  index: number;
  total: number;
  prevId: string | null;
  nextId: string | null;
}

/**
 * 상세 화면 "위험 전주 n / N" 이동. 위험 등급 기록(오탐 제외)을 기록 시각순으로 돈다.
 * 현재 기록이 위험이 아니면 기록 시각 기준으로 앞뒤 위험 전주를 찾는다.
 */
export function dangerQueuePosition(records: readonly PoleRecord[], currentId: string): QueuePosition {
  const queue = sortRecords(
    records.filter((r) => r.grade === 'danger' && !isFalsePositive(r)),
    'time',
  );
  const index = queue.findIndex((r) => r.id === currentId);
  if (index >= 0) {
    return {
      index,
      total: queue.length,
      prevId: queue[index - 1]?.id ?? null,
      nextId: queue[index + 1]?.id ?? null,
    };
  }
  const current = records.find((r) => r.id === currentId);
  const at = current ? Date.parse(current.recordedAt) : Number.NEGATIVE_INFINITY;
  const after = queue.find((r) => Date.parse(r.recordedAt) > at);
  const before = [...queue].reverse().find((r) => Date.parse(r.recordedAt) < at);
  return { index: -1, total: queue.length, prevId: before?.id ?? null, nextId: after?.id ?? null };
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  return {
    page: current,
    pageCount,
    start,
    end: Math.min(start + pageSize, items.length),
    items: items.slice(start, start + pageSize),
  };
}

/** 선택된 기록이 있는 페이지 번호 (1부터). 없으면 `null`. */
export function pageOf<T extends { id: string }>(items: readonly T[], id: string, pageSize: number): number | null {
  const idx = items.findIndex((it) => it.id === id);
  return idx < 0 ? null : Math.floor(idx / pageSize) + 1;
}

/** 두 날짜(YYYY-MM-DD) 사이 간격 문구: "2주", "5일". */
export function intervalLabel(from: string, to: string): string {
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
  return days > 0 && days % 7 === 0 ? `${days / 7}주` : `${days}일`;
}

const TREND_WORD: Record<GradeBasisMetric, Record<BasisTrend, string>> = {
  nest_size: { up: '커짐', down: '작아짐', same: '변화 없음' },
  tree_proximity: { up: '가까워짐', down: '멀어짐', same: '변화 없음' },
};

/** 이력 비교 요약: "2주 사이 커짐 · 연속 발견 2회". 비교할 이전 방문이 없으면 `null`. */
export function historySummary(record: PoleRecord, recordDate: string): string | null {
  const prev = record.previousVisit;
  if (!prev) return null;
  const parts: string[] = [];
  const trend = basisTrend(record);
  const metric = record.basis?.metric ?? prev.basis?.metric;
  if (trend && metric) parts.push(`${intervalLabel(prev.date, recordDate)} 사이 ${TREND_WORD[metric][trend]}`);
  else if (!prev.basis && record.basis) parts.push(`${intervalLabel(prev.date, recordDate)} 사이 새로 발견`);
  if (record.consecutiveFinds > 1) parts.push(`연속 발견 ${record.consecutiveFinds}회`);
  return parts.join(' · ') || null;
}
