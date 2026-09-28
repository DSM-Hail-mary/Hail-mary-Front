/**
 * PoleWatch 도메인 모델. 기능명세서 7장 "데이터 필드"를 옮긴 것이다.
 * API 응답(`src/api/schemas.ts`)과 화면은 모두 이 타입을 기준으로 맞춘다.
 */

/** 위험 등급 3단계. */
export type Grade = 'danger' | 'warn' | 'ok';

/** 위험 유형. 수목은 확장 클래스라 데이터가 있을 때만 들어온다. */
export type HazardType = 'nest' | 'tree';

/** 처리 상태. 양호 기록은 처리 대상이 아니라 `null`이다. */
export type ProcessStatus = 'new' | 'checked' | 'planned' | 'removed';

/** 판정 검수 결과. 미검수는 `null`. */
export type ReviewResult = 'correct' | 'false_positive';

/** 검출 대상. 위험 유형(까치집·수목)과 전주 본체. */
export type DetectionKind = HazardType | 'pole';

export interface LatLng {
  lat: number;
  lng: number;
}

/** 이미지 크기 대비 0~1로 정규화한 박스. (x, y)는 왼쪽 위. */
export interface NormalizedBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Detection {
  kind: DetectionKind;
  box: NormalizedBox;
  /** 0~1 신뢰도. */
  score: number;
}

/** 전주 상단 1024px 판정 크롭 1장. */
export interface Crop {
  id: string;
  url: string;
  detections: Detection[];
}

/**
 * 등급 근거 단계 (0=소/낮음, 1=중, 2=대/높음).
 * 명세서 10장 미정 사항 — 경계값은 판정 쪽에서 정해 내려준다.
 */
export type BasisLevel = 0 | 1 | 2;

export interface GradeBasis {
  /** 무엇으로 판정했는지. 까치집 크기 / 수목 접근 정도. */
  metric: 'nest_size' | 'tree_proximity';
  level: BasisLevel;
}

/** 같은 전주를 이전에 지나갔을 때의 기록 요약. */
export interface PreviousVisit {
  date: string; // YYYY-MM-DD
  thumbnailUrl: string;
  basis: GradeBasis | null;
}

/** 한 번의 주행에서 한 전주를 판정한 결과 1건. */
export interface PoleRecord {
  /** 기록 고유 ID. 전주 ID가 없는(GPS 미수신) 기록도 가진다. */
  id: string;
  /** 전주 ID (GPS 격자 + 진행 방향). GPS 미수신이면 `null` = "ID 미할당". */
  poleId: string | null;
  driveId: string;
  /** GPS 미수신이면 `null`. 지도에는 그리지 않는다. */
  position: LatLng | null;
  /** 진행 방향, 북쪽 기준 시계 방향 각도(0~360). */
  headingDeg: number | null;
  /** ISO 8601 (로컬 시각 포함). */
  recordedAt: string;
  grade: Grade;
  /** 양호 기록은 `null` ("이상 없음"). */
  hazard: HazardType | null;
  /** 양호 기록은 `null` ("해당 없음"). */
  status: ProcessStatus | null;
  review: ReviewResult | null;
  basis: GradeBasis | null;
  thumbnailUrl: string;
  crops: Crop[];
  /** 같은 전주에서 연속으로 위험 요소가 발견된 횟수 (이번 포함). */
  consecutiveFinds: number;
  previousVisit: PreviousVisit | null;
}

/** 사용자가 바꿀 수 있는 필드. */
export type RecordPatch = Partial<Pick<PoleRecord, 'status' | 'review'>>;

/** 주행 1회. */
export interface Drive {
  id: string;
  date: string; // YYYY-MM-DD
  startedAt: string; // ISO
  endedAt: string; // ISO
  route: LatLng[];
  /** 이번 주행에서 지나가지 않은 도로 구간들. */
  unscannedRoads: LatLng[][];
}

/** 기록이 있는 날짜 목록용 요약. */
export interface DriveDate {
  date: string;
  recordCount: number;
}

/** 기기 로그 1분 샘플. */
export interface DeviceSample {
  at: string; // ISO, 해당 분의 시작
  tempC: number;
  powerW: number;
  frameDrops: number;
  gpsFix: boolean;
}

export interface DeviceLog {
  driveId: string;
  deviceName: string;
  vehicleLabel: string;
  /** 온도 경고 기준. */
  tempWarnC: number;
  samples: DeviceSample[];
}

export type SyncStatus =
  | { state: 'done'; lastSyncedAt: string | null }
  | { state: 'syncing'; done: number; total: number; lastSyncedAt: string | null }
  | { state: 'failed'; reason: string; lastSyncedAt: string | null };
