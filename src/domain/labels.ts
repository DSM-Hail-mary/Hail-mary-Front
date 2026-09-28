import type { BasisLevel, DetectionKind, Grade, GradeBasis, HazardType, ProcessStatus } from './types';

/** 화면에 쓰는 한국어 라벨. 문구를 바꿀 때는 여기만 고친다. */

export const GRADES: readonly Grade[] = ['danger', 'warn', 'ok'];

export const GRADE_LABEL: Record<Grade, string> = {
  danger: '위험',
  warn: '주의',
  ok: '양호',
};

/** 등급 글리프 안에 들어가는 한 글자. */
export const GRADE_CHAR: Record<Grade, string> = {
  danger: '위',
  warn: '주',
  ok: '양',
};

export const HAZARDS: readonly HazardType[] = ['nest', 'tree'];

export const HAZARD_LABEL: Record<HazardType, string> = {
  nest: '까치집',
  tree: '수목',
};

export const NO_HAZARD_LABEL = '이상 없음';

export const DETECTION_LABEL: Record<DetectionKind, string> = {
  nest: '까치집',
  tree: '수목',
  pole: '전주',
};

/** 처리 단계 순서 (신규 → 확인 → 철거 예정 → 철거 완료). */
export const STATUS_FLOW: readonly ProcessStatus[] = ['new', 'checked', 'planned', 'removed'];

export const STATUS_LABEL: Record<ProcessStatus, string> = {
  new: '신규',
  checked: '확인',
  planned: '철거 예정',
  removed: '철거 완료',
};

export const NO_STATUS_LABEL = '해당 없음';

export const UNASSIGNED_POLE_ID = 'ID 미할당';

export const BASIS_METRIC_LABEL: Record<GradeBasis['metric'], string> = {
  nest_size: '까치집 크기 등급',
  tree_proximity: '수목 접근 등급',
};

/**
 * 등급 근거 단계 라벨. 단계와 등급의 대응(소=양호, 중=주의, 대=위험)은
 * 명세서 10장 미정 사항이라 확정되면 여기서 바꾼다.
 */
export const BASIS_LEVEL_LABEL: Record<GradeBasis['metric'], Record<BasisLevel, string>> = {
  nest_size: { 0: '소', 1: '중', 2: '대' },
  tree_proximity: { 0: '원거리', 1: '근접', 2: '접촉' },
};

export const BASIS_LEVEL_GRADE: Record<BasisLevel, Grade> = { 0: 'ok', 1: 'warn', 2: 'danger' };

export function statusLabel(status: ProcessStatus | null): string {
  return status ? STATUS_LABEL[status] : NO_STATUS_LABEL;
}

export function hazardLabel(hazard: HazardType | null): string {
  return hazard ? HAZARD_LABEL[hazard] : NO_HAZARD_LABEL;
}

export function poleIdLabel(poleId: string | null): string {
  return poleId ?? UNASSIGNED_POLE_ID;
}

const COMPASS = ['북 (N)', '북동 (NE)', '동 (E)', '남동 (SE)', '남 (S)', '남서 (SW)', '서 (W)', '북서 (NW)'];

export function headingLabel(deg: number | null): string {
  if (deg == null) return '알 수 없음';
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return COMPASS[idx] ?? '알 수 없음';
}
