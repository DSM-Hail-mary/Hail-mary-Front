import { z } from 'zod';
import type { DeviceSample, DeviceSession } from '@/domain/types';

/**
 * 서버 기기 상태 API (GET /api/device/session/latest) 응답 형식과 앱 형식 변환.
 * 명세: 백엔드 "기기 상태 API 명세서" §1 (v0.2.0).
 * 서버 시각은 시간대 없는 HH:MM이라 한국 시간(+09:00)으로 해석한다.
 */

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM 형식이어야 합니다');

export const serverDeviceSessionSchema = z
  .object({
    id: z.number().int(),
    device: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start_time: hhmm,
    // 진행 중/미완료 세션(데모 라이브 등)은 종료·요약값이 아직 null일 수 있다 → 허용하고 아래에서 기본값 처리.
    end_time: hhmm.nullable(),
    duration_sec: z.number().int().nonnegative().nullable(),
    max_temp: z.number().nullable(),
    avg_temp: z.number().nullable(),
    throttle_temp: z.number().nullable(),
    avg_power: z.number().nullable(),
    max_power: z.number().nullable(),
    frame_drops: z.number().int().nonnegative().nullable(),
    total_frames: z.number().int().nonnegative().nullable(),
    gps_reception: z.number().min(0).max(1).nullable(),
    telemetry: z.object({
      t: z.array(hhmm),
      temp: z.array(z.number()),
      power: z.array(z.number()),
      drops: z.array(z.number().int().nonnegative()),
      gps: z.array(z.union([z.literal(0), z.literal(1)])),
    }),
  })
  .refine(({ telemetry: t }) => [t.temp, t.power, t.drops, t.gps].every((a) => a.length === t.t.length), {
    message: 'telemetry 배열(t, temp, power, drops, gps)의 길이가 서로 다릅니다',
    path: ['telemetry'],
  });

export type ServerDeviceSession = z.infer<typeof serverDeviceSessionSchema>;

const TZ = '+09:00';
const DAY_MS = 86_400_000;

/** date + HH:MM → ISO. dayOffset일 뒤 (자정을 넘긴 주행). */
function isoAt(date: string, time: string, dayOffset = 0): string {
  const base = Date.parse(`${date}T${time}:00${TZ}`) + dayOffset * DAY_MS;
  const d = new Date(base + 9 * 3600_000); // KST 벽시계로 다시 적기
  return `${d.toISOString().slice(0, 19)}${TZ}`;
}

export function toDeviceSession(s: ServerDeviceSession): DeviceSession {
  // 시각이 앞 칸보다 작아지면 자정을 넘긴 것
  let offset = 0;
  let prev = '';
  const samples: DeviceSample[] = s.telemetry.t.map((t, i) => {
    if (prev && t < prev) offset += 1;
    prev = t;
    return {
      at: isoAt(s.date, t, offset),
      tempC: s.telemetry.temp[i]!,
      powerW: s.telemetry.power[i]!,
      frameDrops: s.telemetry.drops[i]!,
      gpsFix: s.telemetry.gps[i] === 1,
    };
  });
  // 미완료 세션: 종료시각 없으면 시작시각으로(진행 중). 요약값 없으면 0.
  const endTime = s.end_time ?? s.start_time;
  const endsNextDay = endTime < s.start_time;
  return {
    id: String(s.id),
    device: s.device,
    date: s.date,
    startedAt: isoAt(s.date, s.start_time),
    endedAt: isoAt(s.date, endTime, endsNextDay ? 1 : 0),
    durationSec: s.duration_sec ?? 0,
    maxTemp: s.max_temp ?? 0,
    avgTemp: s.avg_temp ?? 0,
    throttleTemp: s.throttle_temp ?? 87,
    avgPower: s.avg_power ?? 0,
    maxPower: s.max_power ?? 0,
    frameDrops: s.frame_drops ?? 0,
    totalFrames: s.total_frames ?? 0,
    gpsReception: s.gps_reception ?? 0,
    samples,
  };
}
