import { z } from 'zod';
import type { PoleRecord } from '@/domain/types';
import { ApiError, isNotFound, type HailMaryApi } from './HailMaryApi';
import { serverDeviceSessionSchema, toDeviceSession } from './deviceSession';
import { driveDateSchema, driveSchema, poleRecordSchema, syncStatusSchema } from './schemas';

/**
 * 백엔드 REST 구현. 경로와 응답 모양은 `docs/API.md` 참고.
 * 이미지 URL이 상대 경로면 API 주소 기준으로 바꿔 준다.
 */
export function createHttpApi(baseUrl: string): HailMaryApi {
  const base = baseUrl.replace(/\/+$/, '');

  const resolveUrl = (url: string) =>
    /^(https?:|data:|blob:)/.test(url) || !base ? url : `${base}/${url.replace(/^\/+/, '')}`;

  async function request<T>(schema: z.ZodType<T>, path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${base}${path}`, {
        ...init,
        headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
      });
    } catch {
      // 서버가 꺼져 있거나 주소가 틀리면 fetch가 "Failed to fetch"로 실패한다 → 사람이 읽을 말로
      throw new ApiError(0, `서버에 연결할 수 없습니다 (${base || window.location.origin})`);
    }
    if (!res.ok) {
      // 서버 오류 본문이 {"detail": "..."} 이면 그 문구를 쓴다 (FastAPI 형식)
      const text = await res.text().catch(() => '');
      let detail = text;
      try {
        const body = JSON.parse(text) as { detail?: unknown };
        if (typeof body.detail === 'string') detail = body.detail;
      } catch {
        // JSON이 아니면 본문 그대로
      }
      throw new ApiError(res.status, `서버 오류 ${res.status}${detail ? `: ${detail}` : ''}`);
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

  // 날짜가 없으면(전체 기간) 쿼리 없이 요청한다
  const q = (date: string | null) => (date === null ? '' : `?date=${encodeURIComponent(date)}`);

  return {
    listDriveDates: () => request(z.array(driveDateSchema), '/api/v1/drives/dates'),
    listDrives: (date) => request(z.array(driveSchema), `/api/v1/drives${q(date)}`),
    listRecords: async (date) =>
      (await request(z.array(poleRecordSchema), `/api/v1/records${q(date)}`)).map(withAbsoluteUrls),
    getRecord: async (id) =>
      withAbsoluteUrls(await request(poleRecordSchema, `/api/v1/records/${encodeURIComponent(id)}`)),
    updateRecord: async (id, patch) =>
      withAbsoluteUrls(
        await request(poleRecordSchema, `/api/v1/records/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }),
      ),
    getLatestDeviceSession: async () => {
      try {
        return toDeviceSession(await request(serverDeviceSessionSchema, '/api/device/session/latest'));
      } catch (e) {
        // 명세: 세션 기록이 없으면 404 {"detail": "세션 기록 없음"}
        if (isNotFound(e)) return null;
        throw e;
      }
    },
    getSyncStatus: () => request(syncStatusSchema, '/api/v1/sync'),
    retrySync: () => request(syncStatusSchema, '/api/v1/sync/retry', { method: 'POST' }),
  };
}
