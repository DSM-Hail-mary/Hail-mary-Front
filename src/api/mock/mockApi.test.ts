import { describe, expect, it } from 'vitest';
import { countByGrade } from '@/domain/records';
import { poleRecordSchema } from '../schemas';
import { projectBox } from './images';
import { createMockApi } from './mockApi';

describe('mock API', () => {
  it('09-27 주행은 디자인 샘플과 같은 집계', async () => {
    const api = createMockApi({ latencyMs: 0 });
    const records = await api.listRecords('2026-09-27');
    expect(countByGrade(records)).toEqual({ total: 13, danger: 3, warn: 4, ok: 6 });
    expect(records.filter((r) => r.position === null)).toHaveLength(1);
  });

  it('목 데이터는 HTTP 응답 스키마도 통과한다', async () => {
    const api = createMockApi({ latencyMs: 0 });
    for (const r of await api.listRecords('2026-09-27')) {
      expect(poleRecordSchema.safeParse(r).success).toBe(true);
    }
  });

  it('이력 비교: 09-13 중 → 09-27 대, 연속 2회', async () => {
    const api = createMockApi({ latencyMs: 0 });
    const r = await api.getRecord('2026-09-27_3501-12669-N');
    expect(r.previousVisit?.date).toBe('2026-09-13');
    expect(r.previousVisit?.basis?.level).toBe(1);
    expect(r.basis?.level).toBe(2);
    expect(r.consecutiveFinds).toBe(2);
  });

  it('기록 수정이 저장되고, 양호 기록에는 처리 상태를 줄 수 없다', async () => {
    const api = createMockApi({ latencyMs: 0 });
    const saved = await api.updateRecord('2026-09-27_3501-12669-N', { review: 'false_positive' });
    expect(saved.review).toBe('false_positive');
    expect((await api.getRecord(saved.id)).review).toBe('false_positive');
    await expect(api.updateRecord('2026-09-27_3500-12668-E', { status: 'new' })).rejects.toMatchObject({
      status: 422,
    });
  });

  it('동기화 재시도 → 진행 중 → 완료', async () => {
    let t = 0;
    const api = createMockApi({ latencyMs: 0, initialSync: 'failed', syncDurationMs: 1000, now: () => t });
    expect((await api.getSyncStatus()).state).toBe('failed');
    expect((await api.retrySync()).state).toBe('syncing');
    t = 500;
    expect(await api.getSyncStatus()).toMatchObject({ state: 'syncing', done: 170, total: 340 });
    t = 1000;
    expect((await api.getSyncStatus()).state).toBe('done');
  });

  it('기록 없는 날짜는 빈 목록', async () => {
    const api = createMockApi({ latencyMs: 0 });
    expect(await api.listRecords('2026-09-28')).toEqual([]);
  });
});

describe('projectBox', () => {
  it('크롭 영역 기준 0~1로 바꾸고 밖은 자른다', () => {
    expect(projectBox([100, 0, 100, 150], [0, 0, 400, 300])).toEqual({ x: 0.25, y: 0, w: 0.25, h: 0.5 });
    expect(projectBox([350, 0, 100, 100], [0, 0, 400, 300])?.w).toBeCloseTo(0.125);
    expect(projectBox([500, 0, 10, 10], [0, 0, 400, 300])).toBeNull();
  });
});
