import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/deviceSessionLatest.json';
import { serverDeviceSessionSchema, toDeviceSession } from './deviceSession';

const parse = (raw: unknown) => toDeviceSession(serverDeviceSessionSchema.parse(raw));

describe('기기 상태 API 응답 (명세 §1) → 앱 형식', () => {
  it('요약 지표와 시계열을 그대로 옮기고, HH:MM은 한국 시간으로 해석한다', () => {
    const s = parse(fixture);
    expect(s).toMatchObject({
      id: '1',
      device: 'Jetson Nano',
      date: '2026-09-27',
      startedAt: '2026-09-27T09:11:00+09:00',
      endedAt: '2026-09-27T09:32:00+09:00',
      durationSec: 1260,
      maxTemp: 74,
      avgTemp: 66.1,
      throttleTemp: 87,
      avgPower: 8.4,
      maxPower: 9.3,
      frameDrops: 23,
      totalFrames: 37800,
      gpsReception: 0.95,
    });
    expect(s.samples).toHaveLength(22);
    expect(s.samples[0]).toEqual({
      at: '2026-09-27T09:11:00+09:00',
      tempC: 48,
      powerW: 5.8,
      frameDrops: 0,
      gpsFix: true,
    });
    expect(s.samples[20]?.gpsFix).toBe(false); // 09:31 미수신
  });

  it('자정을 넘긴 주행은 다음 날로 이어진다', () => {
    const s = parse({
      ...fixture,
      start_time: '23:59',
      end_time: '00:01',
      telemetry: {
        t: ['23:59', '00:00', '00:01'],
        temp: [1, 2, 3],
        power: [1, 1, 1],
        drops: [0, 0, 0],
        gps: [1, 1, 1],
      },
    });
    expect(s.samples.map((x) => x.at)).toEqual([
      '2026-09-27T23:59:00+09:00',
      '2026-09-28T00:00:00+09:00',
      '2026-09-28T00:01:00+09:00',
    ]);
    expect(s.endedAt).toBe('2026-09-28T00:01:00+09:00');
  });

  it('telemetry 배열 길이가 다르거나 형식이 틀리면 거절한다', () => {
    const bad = { ...fixture, telemetry: { ...fixture.telemetry, temp: [1, 2] } };
    expect(serverDeviceSessionSchema.safeParse(bad).success).toBe(false);
    expect(serverDeviceSessionSchema.safeParse({ ...fixture, start_time: '9:11' }).success).toBe(false);
    expect(serverDeviceSessionSchema.safeParse({ ...fixture, gps_reception: 95 }).success).toBe(false);
  });
});
