import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  applyFilters,
  basisTrend,
  countByGrade,
  dangerQueuePosition,
  exportableRecords,
  historySummary,
  intervalLabel,
  pageOf,
  paginate,
  previousStatus,
  priorityScore,
  toggleConfirm,
} from './records';
import { makeRecord } from './testing';

const at = (hms: string) => `2026-09-27T${hms}+09:00`;

describe('countByGrade', () => {
  it('등급별로 세고 오탐은 뺀다', () => {
    const records = [
      makeRecord({ id: 'a', grade: 'danger' }),
      makeRecord({ id: 'b', grade: 'danger', review: 'false_positive' }),
      makeRecord({ id: 'c', grade: 'warn', review: 'correct' }),
      makeRecord({ id: 'd', grade: 'ok', hazard: null, status: null }),
    ];
    expect(countByGrade(records)).toEqual({ total: 3, danger: 1, warn: 1, ok: 1 });
    expect(countByGrade(records, { includeFalsePositives: true })).toEqual({ total: 4, danger: 2, warn: 1, ok: 1 });
  });
});

describe('applyFilters', () => {
  const records = [
    makeRecord({ id: 'late', recordedAt: at('09:30:00'), grade: 'warn', hazard: 'tree', status: 'checked' }),
    makeRecord({ id: 'early', recordedAt: at('09:10:00'), grade: 'danger', hazard: 'nest', status: 'new' }),
    makeRecord({ id: 'ok', recordedAt: at('09:20:00'), grade: 'ok', hazard: null, status: null }),
  ];

  it('기본은 전체를 기록 시각순으로', () => {
    expect(applyFilters(records, DEFAULT_FILTERS).map((r) => r.id)).toEqual(['early', 'ok', 'late']);
  });

  it('등급·유형·처리 상태를 모두 적용한다', () => {
    expect(applyFilters(records, { ...DEFAULT_FILTERS, grades: ['warn'] }).map((r) => r.id)).toEqual(['late']);
    expect(applyFilters(records, { ...DEFAULT_FILTERS, hazard: 'nest' }).map((r) => r.id)).toEqual(['early']);
    expect(applyFilters(records, { ...DEFAULT_FILTERS, status: 'new' }).map((r) => r.id)).toEqual(['early']);
    expect(applyFilters(records, { ...DEFAULT_FILTERS, grades: ['danger'], status: 'removed' })).toEqual([]);
  });

  it('등급은 여러 개를 함께 고를 수 있고, 하나도 안 고르면 비어 있다', () => {
    expect(applyFilters(records, { ...DEFAULT_FILTERS, grades: ['danger', 'ok'] }).map((r) => r.id)).toEqual([
      'early',
      'ok',
    ]);
    expect(applyFilters(records, { ...DEFAULT_FILTERS, grades: [] })).toEqual([]);
  });

  it('처리 상태 필터는 양호(상태 없음)를 제외한다', () => {
    const ids = applyFilters(records, { ...DEFAULT_FILTERS, status: 'checked' }).map((r) => r.id);
    expect(ids).not.toContain('ok');
  });
});

describe('priorityScore', () => {
  it('위험 > 주의 > 양호, 오탐은 맨 뒤', () => {
    const danger = makeRecord({ grade: 'danger' });
    const warn = makeRecord({ grade: 'warn' });
    const ok = makeRecord({ grade: 'ok', hazard: null, status: null, consecutiveFinds: 0 });
    const fp = makeRecord({ grade: 'danger', review: 'false_positive' });
    expect(priorityScore(danger)).toBeGreaterThan(priorityScore(warn));
    expect(priorityScore(warn)).toBeGreaterThan(priorityScore(ok));
    expect(priorityScore(ok)).toBeGreaterThan(priorityScore(fp));
  });

  it('커지는 추세와 연속 발견이 점수를 올린다', () => {
    const base = makeRecord({ consecutiveFinds: 1 });
    const growing = makeRecord({
      consecutiveFinds: 3,
      previousVisit: { date: '2026-09-13', thumbnailUrl: '', basis: { metric: 'nest_size', level: 1 } },
    });
    expect(priorityScore(growing)).toBeGreaterThan(priorityScore(base));
  });

  it('우선순위 정렬은 점수 내림차순, 같으면 시각순', () => {
    const records = [
      makeRecord({ id: 'w', grade: 'warn', recordedAt: at('09:00:00') }),
      makeRecord({ id: 'd2', grade: 'danger', recordedAt: at('09:20:00') }),
      makeRecord({ id: 'd1', grade: 'danger', recordedAt: at('09:10:00') }),
    ];
    expect(applyFilters(records, { ...DEFAULT_FILTERS, sort: 'priority' }).map((r) => r.id)).toEqual(['d1', 'd2', 'w']);
  });
});

describe('basisTrend', () => {
  const prev = (level: 0 | 1 | 2) => ({
    date: '2026-09-13',
    thumbnailUrl: '',
    basis: { metric: 'nest_size' as const, level },
  });

  it('이전 방문과 단계를 비교한다', () => {
    expect(basisTrend(makeRecord({ previousVisit: prev(1) }))).toBe('up');
    expect(basisTrend(makeRecord({ previousVisit: prev(2) }))).toBe('same');
    expect(basisTrend(makeRecord({ basis: { metric: 'nest_size', level: 1 }, previousVisit: prev(2) }))).toBe('down');
  });

  it('비교할 수 없으면 null', () => {
    expect(basisTrend(makeRecord())).toBeNull();
    expect(
      basisTrend(
        makeRecord({
          previousVisit: { date: '2026-09-13', thumbnailUrl: '', basis: { metric: 'tree_proximity', level: 1 } },
        }),
      ),
    ).toBeNull();
  });
});

describe('처리 상태 전환', () => {
  it('확인 처리 토글은 신규 ↔ 확인만', () => {
    expect(toggleConfirm('new')).toBe('checked');
    expect(toggleConfirm('checked')).toBe('new');
    expect(toggleConfirm('planned')).toBe('planned');
    expect(toggleConfirm(null)).toBeNull();
  });

  it('되돌리기는 한 단계 앞으로, 첫 단계에서는 그대로', () => {
    expect(previousStatus('removed')).toBe('planned');
    expect(previousStatus('checked')).toBe('new');
    expect(previousStatus('new')).toBe('new');
  });
});

describe('dangerQueuePosition', () => {
  const records = [
    makeRecord({ id: 'd1', grade: 'danger', recordedAt: at('09:10:00') }),
    makeRecord({ id: 'w1', grade: 'warn', recordedAt: at('09:15:00') }),
    makeRecord({ id: 'd2', grade: 'danger', recordedAt: at('09:20:00') }),
    makeRecord({ id: 'd3', grade: 'danger', recordedAt: at('09:30:00') }),
  ];

  it('위험 기록이면 n / N과 앞뒤를 준다', () => {
    expect(dangerQueuePosition(records, 'd1')).toEqual({ index: 0, total: 3, prevId: null, nextId: 'd2' });
    expect(dangerQueuePosition(records, 'd3')).toEqual({ index: 2, total: 3, prevId: 'd2', nextId: null });
  });

  it('오탐 판정된 위험 기록은 대기열에서 빠진다', () => {
    const withFp = [
      ...records,
      makeRecord({ id: 'fp', grade: 'danger', review: 'false_positive', recordedAt: at('09:25:00') }),
    ];
    expect(dangerQueuePosition(withFp, 'd2')).toEqual({ index: 1, total: 3, prevId: 'd1', nextId: 'd3' });
    expect(dangerQueuePosition(withFp, 'fp').index).toBe(-1);
  });

  it('위험이 아니면 시각 기준 앞뒤 위험 기록을 찾는다', () => {
    expect(dangerQueuePosition(records, 'w1')).toEqual({ index: -1, total: 3, prevId: 'd1', nextId: 'd2' });
  });
});

describe('paginate / pageOf', () => {
  const items = Array.from({ length: 120 }, (_, i) => ({ id: String(i) }));

  it('페이지 범위를 넘으면 끝 페이지로 맞춘다', () => {
    const p = paginate(items, 9, 50);
    expect(p).toMatchObject({ page: 3, pageCount: 3, start: 100, end: 120 });
    expect(p.items).toHaveLength(20);
  });

  it('빈 목록도 1페이지', () => {
    expect(paginate([], 1, 50)).toMatchObject({ page: 1, pageCount: 1, start: 0, end: 0 });
  });

  it('선택 기록이 있는 페이지', () => {
    expect(pageOf(items, '0', 50)).toBe(1);
    expect(pageOf(items, '50', 50)).toBe(2);
    expect(pageOf(items, 'x', 50)).toBeNull();
  });
});

describe('exportableRecords', () => {
  it('위험 전주만, 오탐 빼고, 시각순', () => {
    const records = [
      makeRecord({ id: 'd2', recordedAt: at('09:20:00') }),
      makeRecord({ id: 'w', grade: 'warn' }),
      makeRecord({ id: 'fp', review: 'false_positive' }),
      makeRecord({ id: 'd1', recordedAt: at('09:10:00') }),
    ];
    expect(exportableRecords(records).map((r) => r.id)).toEqual(['d1', 'd2']);
  });
});

describe('historySummary', () => {
  it('간격·변화·연속 발견을 이어 붙인다', () => {
    const r = makeRecord({
      consecutiveFinds: 2,
      previousVisit: { date: '2026-09-13', thumbnailUrl: '', basis: { metric: 'nest_size', level: 1 } },
    });
    expect(historySummary(r, '2026-09-27')).toBe('2주 사이 커짐 · 연속 발견 2회');
  });

  it('이전엔 없던 위험 요소는 새로 발견', () => {
    const r = makeRecord({ previousVisit: { date: '2026-09-20', thumbnailUrl: '', basis: null } });
    expect(historySummary(r, '2026-09-27')).toBe('1주 사이 새로 발견');
  });

  it('이전 방문이 없으면 null, 간격은 일 단위도', () => {
    expect(historySummary(makeRecord(), '2026-09-27')).toBeNull();
    expect(intervalLabel('2026-09-20', '2026-09-25')).toBe('5일');
  });
});
