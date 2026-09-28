import type { DeviceSession, Drive, DriveDate, PoleRecord, RecordPatch, SyncStatus } from '@/domain/types';

/**
 * 화면이 쓰는 데이터 소스 계약. 목(mock)과 HTTP 구현이 같은 인터페이스를 따른다.
 * HTTP 엔드포인트 제안은 `docs/API.md`에 있다.
 */
export interface HailMaryApi {
  /** 기록이 있는 날짜 (최신순). */
  listDriveDates(): Promise<DriveDate[]>;
  /** 해당 날짜의 주행들 (시작 시각순). */
  listDrives(date: string): Promise<Drive[]>;
  /** 해당 날짜의 기록 전체. */
  listRecords(date: string): Promise<PoleRecord[]>;
  getRecord(id: string): Promise<PoleRecord>;
  updateRecord(id: string, patch: RecordPatch): Promise<PoleRecord>;
  /** 가장 최근 주행 세션의 기기 상태. 기록이 없으면(서버 404) null. */
  getLatestDeviceSession(): Promise<DeviceSession | null>;
  getSyncStatus(): Promise<SyncStatus>;
  retrySync(): Promise<SyncStatus>;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
