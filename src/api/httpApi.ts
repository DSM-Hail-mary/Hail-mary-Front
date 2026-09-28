import { z } from 'zod';
import type { PoleRecord } from '@/domain/types';
import { ApiError, type PoleWatchApi } from './PoleWatchApi';
import { deviceLogSchema, driveDateSchema, driveSchema, poleRecordSchema, syncStatusSchema } from './schemas';

/**
 * 백엔드 REST 구현. 경로와 응답 모양은 `docs/API.md` 참고.
 * 이미지 URL이 상대 경로면 API 주소 기준으로 바꿔 준다.
 */
export function createHttpApi(baseUrl: string): PoleWatchApi {
  const base = baseUrl.replace(/\/+$/, '');

  const resolveUrl = (url: string) =>
    /^(https?:|data:|blob:)/.test(url) || !base ? url : `${base}/${url.replace(/^\/+/, '')}`;

  async function request<T>(schema: z.ZodType<T>, path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ApiError(res.status, text || `${res.status} ${res.statusText}`);
    }
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) {
      throw new ApiError(0, `응답 형식이 맞지 않습니다 (${path}): ${z.prettifyError(parsed.error)}`);
    }
    return parsed.data;
  }

  const withAbsoluteUrls = (r: PoleRecord): PoleRecord => ({
    ...r,
    thumbnailUrl: resolveUrl(r.thumbnailUrl),
    crops: r.crops.map((c) => ({ ...c, url: resolveUrl(c.url) })),
    previousVisit: r.previousVisit
      ? { ...r.previousVisit, thumbnailUrl: resolveUrl(r.previousVisit.thumbnailUrl) }
      : null,
  });

  const q = (date: string) => `date=${encodeURIComponent(date)}`;

  return {
    listDriveDates: () => request(z.array(driveDateSchema), '/api/v1/drives/dates'),
    listDrives: (date) => request(z.array(driveSchema), `/api/v1/drives?${q(date)}`),
    listRecords: async (date) =>
      (await request(z.array(poleRecordSchema), `/api/v1/records?${q(date)}`)).map(withAbsoluteUrls),
    getRecord: async (id) =>
      withAbsoluteUrls(await request(poleRecordSchema, `/api/v1/records/${encodeURIComponent(id)}`)),
    updateRecord: async (id, patch) =>
      withAbsoluteUrls(
        await request(poleRecordSchema, `/api/v1/records/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }),
      ),
    getDeviceLog: (driveId) => request(deviceLogSchema, `/api/v1/drives/${encodeURIComponent(driveId)}/device-log`),
    getSyncStatus: () => request(syncStatusSchema, '/api/v1/sync'),
    retrySync: () => request(syncStatusSchema, '/api/v1/sync/retry', { method: 'POST' }),
  };
}
