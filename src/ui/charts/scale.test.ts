import { describe, expect, it } from 'vitest';
import { axisScale, linear, niceStep } from './scale';

describe('axisScale', () => {
  it('온도: 10 단위 바닥 + 경고 기준 포함 + 라벨 여유', () => {
    expect(axisScale([48, 60, 74], { zeroBased: false, threshold: 80 })).toEqual({
      min: 40,
      max: 90,
      ticks: [40, 60, 80],
    });
  });

  it('전력·프레임 드롭: 0부터, 위 눈금이 최댓값을 덮는다', () => {
    expect(axisScale([5.8, 9.3], { zeroBased: true })).toEqual({ min: 0, max: 10, ticks: [0, 5, 10] });
    expect(axisScale([0, 6], { zeroBased: true })).toEqual({ min: 0, max: 8, ticks: [0, 4, 8] });
  });

  it('데이터가 기준선보다 높아도(과열) 기준선이 축 안에 있다', () => {
    const s = axisScale([85, 90], { zeroBased: false, threshold: 75 });
    expect(s.min).toBeLessThanOrEqual(75);
    expect(s.max).toBeGreaterThanOrEqual(90);
  });

  it('값이 모두 0이어도 범위가 생긴다', () => {
    const s = axisScale([0, 0], { zeroBased: true });
    expect(s.max).toBeGreaterThan(s.min);
  });
});

describe('niceStep / linear', () => {
  it('보기 좋은 간격', () => {
    expect(niceStep(20)).toBe(20);
    expect(niceStep(4.65)).toBe(5);
    expect(niceStep(0.3)).toBeCloseTo(0.4);
  });

  it('선형 변환', () => {
    const y = linear([40, 90], [176, 12]);
    expect(y(40)).toBe(176);
    expect(y(90)).toBe(12);
  });
});
