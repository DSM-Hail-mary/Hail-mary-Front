import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from '@/domain/records';
import { parseMapParams, serializeMapParams } from './mapParams';

const TODAY = '2026-09-28';

describe('mapParams', () => {
  it('비어 있으면 오늘 + 기본 필터', () => {
    expect(parseMapParams(new URLSearchParams(), TODAY)).toEqual({
      date: TODAY,
      filters: DEFAULT_FILTERS,
      selectedId: null,
    });
  });

  it('잘못된 값은 기본값으로', () => {
    const p = parseMapParams(new URLSearchParams('date=2026-99-99&grade=bad&sort=x&status=removed'), TODAY);
    expect(p.date).toBe(TODAY);
    expect(p.filters).toEqual({ ...DEFAULT_FILTERS, status: 'removed' });
  });

  it('왕복하면 같은 값, 기본값은 URL에서 빠진다', () => {
    const params = {
      date: '2026-09-27',
      filters: { ...DEFAULT_FILTERS, grade: 'danger' as const, sort: 'priority' as const },
      selectedId: 'rec-1',
    };
    const qs = serializeMapParams(params, TODAY);
    expect(qs.toString()).toBe('date=2026-09-27&grade=danger&sort=priority&sel=rec-1');
    expect(parseMapParams(qs, TODAY)).toEqual(params);
    expect(serializeMapParams({ date: TODAY, filters: DEFAULT_FILTERS, selectedId: null }, TODAY).toString()).toBe('');
  });
});
