import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  applyFilters,
  basisTrend,
  countByGrade,
  dangerQueuePosition,
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
    expect(applyFilters(records, { ...DEFAULT_FILTERS, grade: 'warn' }).map((r) => r.id)).toEqual(['late']);
    expect(applyFilters(records, { ...DEFAULT_FILTERS, hazard: 'nest' }).map((r) => r.id)).toEqual(['early']);
    expect(applyFilters(records, { ...DEFAULT_FILTERS, status: 'new' }).map((r) => r.id)).toEqual(['early']);
    expect(applyFilters(records, { ...DEFAULT_FILTERS, grade: 'danger', status: 'removed' })).toEqual([]);
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
