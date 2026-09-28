import { describe, expect, it } from 'vitest';
import { gpsGaps, locationlessRecordsIn, summarizeDevice } from './device';
import { makeRecord } from './testing';
import type { DeviceSample } from './types';

const sample = (minute: number, over: Partial<DeviceSample> = {}): DeviceSample => ({
  at: new Date(Date.UTC(2026, 8, 27, 0, 11 + minute)).toISOString(), // 09:11 KST + minute
  tempC: 60,
  powerW: 8,
  frameDrops: 0,
  gpsFix: true,
  ...over,
});

describe('summarizeDevice', () => {
  it('최고·평균·합계·수신율', () => {
    const s = summarizeDevice([
      sample(0, { tempC: 50, powerW: 6, frameDrops: 1 }),
      sample(1, { tempC: 70, powerW: 10, frameDrops: 4, gpsFix: false }),
      sample(2, { tempC: 60, powerW: 8, frameDrops: 4 }),
      sample(3),
    ]);
    expect(s).toMatchObject({
      maxTemp: 70,
      avgTemp: 60,
      avgPower: 8,
      maxPower: 10,
      dropTotal: 9,
      dropPeak: { index: 1, value: 4 },
      gpsRate: 75,
      gpsMissMinutes: 1,
    });
  });

  it('드롭이 없으면 최다 구간 없음, 샘플이 없으면 null', () => {
    expect(summarizeDevice([sample(0)])?.dropPeak).toBeNull();
    expect(summarizeDevice([])).toBeNull();
  });
});

describe('gpsGaps', () => {
  it('연속 미수신을 하나의 구간으로 묶는다', () => {
    const samples = [0, 1, 2, 3, 4, 5].map((m) => sample(m, { gpsFix: ![1, 2, 5].includes(m) }));
    const gaps = gpsGaps(samples);
    expect(gaps.map((g) => [g.startIndex, g.endIndex, g.minutes])).toEqual([
      [1, 2, 2],
      [5, 5, 1],
    ]);
    expect(gaps[0]?.endAt).toBe(samples[3]?.at);
  });

  it('구간 안의 위치 없는 기록만 센다', () => {
    const samples = [sample(0), sample(1, { gpsFix: false }), sample(2)];
    const [gap] = gpsGaps(samples);
    const records = [
      makeRecord({ id: 'in', position: null, recordedAt: '2026-09-27T09:12:30+09:00' }),
      makeRecord({ id: 'located', recordedAt: '2026-09-27T09:12:40+09:00' }),
      makeRecord({ id: 'after', position: null, recordedAt: '2026-09-27T09:13:00+09:00' }),
    ];
    expect(locationlessRecordsIn(records, gap!)).toBe(1);
  });
});
