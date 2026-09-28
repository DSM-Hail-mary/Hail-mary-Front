import { describe, expect, it } from 'vitest';
import {
  dateOf,
  formatCoord,
  formatDateLabel,
  formatDateTime,
  formatDecimal,
  formatSyncTime,
  formatTime,
  isDateString,
} from './format';
import { headingLabel } from './labels';

describe('format', () => {
  it('좌표는 소수 5자리', () => {
    expect(formatCoord({ lat: 35.014623, lng: 126.6918 })).toBe('35.01462, 126.69180');
  });

  it('시각은 한국 시간 기준 (입력 시간대와 무관)', () => {
    expect(formatTime('2026-09-27T00:15:22Z')).toBe('09:15:22');
    expect(formatDateTime('2026-09-27T09:15:22+09:00')).toBe('2026-09-27 09:15:22');
    expect(formatSyncTime('2026-09-27T18:42:00+09:00')).toBe('09.27 18:42');
  });

  it('자정 근처 날짜도 한국 시간 기준으로 자른다', () => {
    expect(dateOf('2026-09-26T15:30:00Z')).toBe('2026-09-27');
  });

  it('날짜 라벨에 요일을 붙인다', () => {
    expect(formatDateLabel('2026-09-27')).toBe('2026. 9. 27 (일)');
  });

  it('날짜 문자열 검사', () => {
    expect(isDateString('2026-09-27')).toBe(true);
    expect(isDateString('2026-9-27')).toBe(false);
    expect(isDateString('2026-13-40')).toBe(false);
  });

  it('소수 한 자리, .0은 뗀다', () => {
    expect(formatDecimal(8)).toBe('8');
    expect(formatDecimal(8.46)).toBe('8.5');
  });

  it('진행 방향 8방위', () => {
    expect(headingLabel(0)).toBe('북 (N)');
    expect(headingLabel(92)).toBe('동 (E)');
    expect(headingLabel(-90)).toBe('서 (W)');
    expect(headingLabel(null)).toBe('알 수 없음');
  });
});
