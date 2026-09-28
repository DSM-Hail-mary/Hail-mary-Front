import { describe, expect, it } from 'vitest';
import { monthGrid } from './calendarGrid';

describe('monthGrid', () => {
  it('6주 42칸, 1일이 있는 주의 일요일부터', () => {
    const g = monthGrid('2026-09'); // 2026-09-01은 화요일
    expect(g).toHaveLength(42);
    expect(g[0]).toBe('2026-08-30');
    expect(g[2]).toBe('2026-09-01');
    expect(g.at(-1)).toBe('2026-10-10');
  });

  it('1일이 일요일이면 그날부터, 연도 경계도 넘는다', () => {
    expect(monthGrid('2026-02')[0]).toBe('2026-02-01');
    expect(monthGrid('2027-01')[0]).toBe('2026-12-27');
  });
});
