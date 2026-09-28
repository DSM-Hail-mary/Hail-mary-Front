/** 차트 y축 범위와 눈금 계산. 한 차트에 눈금 3개(아래·가운데·위)를 쓴다. */

const NICE_STEPS = [1, 2, 2.5, 4, 5, 10];

/** raw 이상인 가장 작은 "보기 좋은" 간격. */
export function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = 10 ** exp;
  const nice = NICE_STEPS.find((s) => s * base >= raw - 1e-9) ?? 10;
  return nice * base;
}

export interface AxisScale {
  min: number;
  max: number;
  ticks: [number, number, number];
}

export interface AxisOptions {
  /** 0부터 시작할지 (전력·프레임 드롭). 아니면 데이터 최솟값 아래 10 단위. */
  zeroBased: boolean;
  /** 기준선(경고 온도 등)이 있으면 범위에 포함하고 라벨 자리를 남긴다. */
  threshold?: number | null;
}

export function axisScale(values: readonly number[], opts: AxisOptions): AxisScale {
  const dataMin = values.length ? Math.min(...values) : 0;
  const dataMax = values.length ? Math.max(...values) : 1;
  const min = opts.zeroBased ? 0 : Math.floor(dataMin / 10) * 10;
  const top = Math.max(dataMax, opts.threshold ?? Number.NEGATIVE_INFINITY, min + 1);
  const step = niceStep((top - min) / 2);
  const ticks: [number, number, number] = [min, min + step, min + step * 2];
  const needsLabelRoom = opts.threshold != null && opts.threshold >= ticks[2] - step / 4;
  const max = needsLabelRoom ? ticks[2] + step / 2 : ticks[2];
  return { min, max, ticks };
}

export function linear(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}
