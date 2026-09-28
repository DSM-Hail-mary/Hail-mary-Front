import { z } from 'zod';
import type { DeviceLog, Drive, DriveDate, PoleRecord, SyncStatus } from '@/domain/types';

/**
 * HTTP 응답 검증. 서버가 계약과 다른 모양을 보내면 화면이 조용히 깨지는 대신
 * 어느 필드가 틀렸는지 에러로 드러나게 한다.
 */

const latLng = z.object({ lat: z.number(), lng: z.number() });
const hazard = z.enum(['nest', 'tree']);
const basis = z.object({
  metric: z.enum(['nest_size', 'tree_proximity']),
  level: z.union([z.literal(0), z.literal(1), z.literal(2)]),
});

const detection = z.object({
  kind: z.enum(['nest', 'tree', 'pole']),
  box: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
  score: z.number(),
});

export const poleRecordSchema = z.object({
  id: z.string(),
  poleId: z.string().nullable(),
  driveId: z.string(),
  position: latLng.nullable(),
  headingDeg: z.number().nullable(),
  recordedAt: z.string(),
  grade: z.enum(['danger', 'warn', 'ok']),
  hazard: hazard.nullable(),
  status: z.enum(['new', 'checked', 'planned', 'removed']).nullable(),
  review: z.enum(['correct', 'false_positive']).nullable(),
  basis: basis.nullable(),
  thumbnailUrl: z.string(),
  crops: z.array(z.object({ id: z.string(), url: z.string(), detections: z.array(detection) })),
  consecutiveFinds: z.number().int().nonnegative(),
  previousVisit: z.object({ date: z.string(), thumbnailUrl: z.string(), basis: basis.nullable() }).nullable(),
}) satisfies z.ZodType<PoleRecord>;

export const driveSchema = z.object({
  id: z.string(),
  date: z.string(),
  startedAt: z.string(),
  endedAt: z.string(),
  route: z.array(latLng),
  unscannedRoads: z.array(z.array(latLng)),
}) satisfies z.ZodType<Drive>;

export const driveDateSchema = z.object({
  date: z.string(),
  recordCount: z.number().int().nonnegative(),
}) satisfies z.ZodType<DriveDate>;

export const deviceLogSchema = z.object({
  driveId: z.string(),
  deviceName: z.string(),
  vehicleLabel: z.string(),
  tempWarnC: z.number(),
  samples: z.array(
    z.object({
      at: z.string(),
      tempC: z.number(),
      powerW: z.number(),
      frameDrops: z.number().int().nonnegative(),
      gpsFix: z.boolean(),
    }),
  ),
}) satisfies z.ZodType<DeviceLog>;

const lastSyncedAt = z.string().nullable();

export const syncStatusSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('done'), lastSyncedAt }),
  z.object({
    state: z.literal('syncing'),
    done: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    lastSyncedAt,
  }),
  z.object({ state: z.literal('failed'), reason: z.string(), lastSyncedAt }),
]) satisfies z.ZodType<SyncStatus>;
