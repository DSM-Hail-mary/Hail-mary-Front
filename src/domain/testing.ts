import type { PoleRecord } from './types';

/** 테스트용 기록. 필요한 필드만 덮어써서 쓴다. */
export function makeRecord(overrides: Partial<PoleRecord> = {}): PoleRecord {
  return {
    id: 'r1',
    poleId: '3501-12669-N',
    driveId: 'd1',
    position: { lat: 35.01462, lng: 126.69183 },
    headingDeg: 0,
    recordedAt: '2026-09-27T09:15:22+09:00',
    grade: 'danger',
    hazard: 'nest',
    status: 'new',
    review: null,
    basis: { metric: 'nest_size', level: 2 },
    thumbnailUrl: 'thumb.jpg',
    crops: [],
    consecutiveFinds: 1,
    previousVisit: null,
    ...overrides,
  };
}
