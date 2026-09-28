import { dateOf } from '@/domain/format';
import type { DriveDate, PoleRecord, SyncStatus } from '@/domain/types';
import { ApiError, type PoleWatchApi } from '../PoleWatchApi';
import { createMockDataset } from './data';

export type MockSyncMode = 'done' | 'syncing' | 'failed';

export interface MockApiOptions {
  /** 응답 지연 (ms). 로딩 상태를 눈으로 확인하려고 둔다. */
  latencyMs?: number;
  initialSync?: MockSyncMode;
  /** 동기화 진행이 끝나기까지 걸리는 시간 (ms). */
  syncDurationMs?: number;
  now?: () => number;
}

const SYNC_TOTAL_IMAGES = 340;

/** 메모리 안에서 동작하는 API. 새로고침하면 처음 상태로 돌아간다. */
export function createMockApi(options: MockApiOptions = {}): PoleWatchApi {
  const { latencyMs = 40, initialSync = 'done', syncDurationMs = 8000, now = Date.now } = options;
  const data = createMockDataset();
  const records = new Map<string, PoleRecord>(data.records.map((r) => [r.id, r]));
  let lastSyncedAt: string | null = data.lastSyncedAt;
  let sync: { state: 'done' } | { state: 'syncing'; startedAt: number } | { state: 'failed'; reason: string } =
    initialSync === 'syncing'
      ? { state: 'syncing', startedAt: now() - syncDurationMs * 0.62 }
      : initialSync === 'failed'
        ? { state: 'failed', reason: 'Wi-Fi 연결 끊김' }
        : { state: 'done' };

  const delay = <T>(value: T): Promise<T> =>
    new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), latencyMs));

  const recordDate = (r: PoleRecord) => dateOf(r.recordedAt);

  function currentSync(): SyncStatus {
    if (sync.state === 'syncing') {
      const progress = (now() - sync.startedAt) / syncDurationMs;
      if (progress >= 1) {
        sync = { state: 'done' };
        lastSyncedAt = new Date(now()).toISOString();
      } else {
        return {
          state: 'syncing',
          done: Math.floor(progress * SYNC_TOTAL_IMAGES),
          total: SYNC_TOTAL_IMAGES,
          lastSyncedAt,
        };
      }
    }
    if (sync.state === 'failed') return { state: 'failed', reason: sync.reason, lastSyncedAt };
    return { state: 'done', lastSyncedAt };
  }

  return {
    listDriveDates() {
      const counts = new Map<string, number>();
      for (const d of data.drives) counts.set(d.date, 0);
      for (const r of records.values()) counts.set(recordDate(r), (counts.get(recordDate(r)) ?? 0) + 1);
      const list: DriveDate[] = [...counts].map(([date, recordCount]) => ({ date, recordCount }));
      return delay(list.sort((a, b) => b.date.localeCompare(a.date)));
    },
    listDrives(date) {
      return delay(data.drives.filter((d) => d.date === date));
    },
    listRecords(date) {
      return delay([...records.values()].filter((r) => recordDate(r) === date));
    },
    getRecord(id) {
      const r = records.get(id);
      if (!r) return Promise.reject(new ApiError(404, `기록을 찾을 수 없습니다: ${id}`));
      return delay(r);
    },
    updateRecord(id, patch) {
      const r = records.get(id);
      if (!r) return Promise.reject(new ApiError(404, `기록을 찾을 수 없습니다: ${id}`));
      if (patch.status !== undefined && r.status === null && patch.status !== null) {
        return Promise.reject(new ApiError(422, '양호 기록은 처리 상태를 가질 수 없습니다'));
      }
      const next: PoleRecord = { ...r, ...patch };
      records.set(id, next);
      return delay(next);
    },
    getDeviceLog(driveId) {
      const log = data.deviceLogs.find((l) => l.driveId === driveId);
      if (!log) return Promise.reject(new ApiError(404, `기기 로그가 없습니다: ${driveId}`));
      return delay(log);
    },
    getSyncStatus() {
      return delay(currentSync());
    },
    retrySync() {
      sync = { state: 'syncing', startedAt: now() };
      return delay(currentSync());
    },
  };
}
