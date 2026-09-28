import type { DeviceSample, PoleRecord } from './types';

export interface DeviceSummary {
  maxTemp: number;
  avgTemp: number;
  avgPower: number;
  maxPower: number;
  dropTotal: number;
  /** 프레임 드롭이 가장 많았던 분. 드롭이 없으면 `null`. */
  dropPeak: { index: number; value: number } | null;
  /** GPS 수신율 0~100 (정수). */
  gpsRate: number;
  gpsMissMinutes: number;
}

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

export function summarizeDevice(samples: readonly DeviceSample[]): DeviceSummary | null {
  if (samples.length === 0) return null;
  const temps = samples.map((s) => s.tempC);
  const powers = samples.map((s) => s.powerW);
  const drops = samples.map((s) => s.frameDrops);
  const fix = samples.filter((s) => s.gpsFix).length;
  const peakValue = Math.max(...drops);
  return {
    maxTemp: Math.max(...temps),
    avgTemp: sum(temps) / samples.length,
    avgPower: sum(powers) / samples.length,
    maxPower: Math.max(...powers),
    dropTotal: sum(drops),
    dropPeak: peakValue > 0 ? { index: drops.indexOf(peakValue), value: peakValue } : null,
    gpsRate: Math.round((fix / samples.length) * 100),
    gpsMissMinutes: samples.length - fix,
  };
}

export interface GpsGap {
  startIndex: number;
  /** 포함 (마지막 미수신 분). */
  endIndex: number;
  startAt: string;
  /** 미수신 구간이 끝나는 시각 (마지막 분 + 1분, 미포함). */
  endAt: string;
  minutes: number;
}

/** 연속된 GPS 미수신 분을 구간으로 묶는다. */
export function gpsGaps(samples: readonly DeviceSample[]): GpsGap[] {
  const gaps: GpsGap[] = [];
  let start = -1;
  const close = (end: number) => {
    const first = samples[start];
    const last = samples[end];
    if (!first || !last) return;
    gaps.push({
      startIndex: start,
      endIndex: end,
      startAt: first.at,
      endAt: new Date(Date.parse(last.at) + 60_000).toISOString(),
      minutes: end - start + 1,
    });
  };
  samples.forEach((s, i) => {
    if (!s.gpsFix && start < 0) start = i;
    if (s.gpsFix && start >= 0) {
      close(i - 1);
      start = -1;
    }
  });
  if (start >= 0) close(samples.length - 1);
  return gaps;
}

/** 미수신 구간에 들어온 "위치 없음" 기록 수. */
export function locationlessRecordsIn(records: readonly PoleRecord[], gap: GpsGap): number {
  const from = Date.parse(gap.startAt);
  const to = Date.parse(gap.endAt);
  return records.filter((r) => {
    if (r.position) return false;
    const t = Date.parse(r.recordedAt);
    return t >= from && t < to;
  }).length;
}
