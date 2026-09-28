import { describe, expect, it } from 'vitest';
import { countByGrade, dangerQueuePosition, exportableRecords } from '@/domain/records';
import { createMockApi } from './mockApi';
import { createSampleDataset } from './sampleData';

describe('전체 기간 (date = null)', () => {
  it('모든 날짜 기록·주행을 준다', async () => {
    const api = createMockApi({ latencyMs: 0, dataset: createSampleDataset() });
    const all = await api.listRecords(null);
    const perDay = await Promise.all(['2026-09-13', '2026-09-20', '2026-09-27'].map((d) => api.listRecords(d)));
    expect(all).toHaveLength(perDay.reduce((n, l) => n + l.length, 0));
    expect(await api.listDrives(null)).toHaveLength(3);
    expect(countByGrade(all)).toEqual({ total: 29, danger: 5, warn: 7, ok: 17 }); // 오탐 1건 제외
    expect(exportableRecords(all)).toHaveLength(5);
    expect(dangerQueuePosition(all, '2026-09-27_3501-12669-N')).toMatchObject({ index: 2, total: 5 });
  });
});
