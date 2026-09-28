import { hazardLabel, statusLabel } from '@/domain/labels';
import type { HazardType, ProcessStatus } from '@/domain/types';
import styles from './Pills.module.css';

/** 처리 상태 필. 양호(상태 없음)는 "해당 없음" 글자만. */
export function StatusPill({ status }: { status: ProcessStatus | null }) {
  return <span className={`${styles.status} ${styles[status ?? 'none']}`}>{statusLabel(status)}</span>;
}

/** 목록 행의 위험 유형 태그. 이상 없음은 테두리 없이. */
export function HazardTag({ hazard, size = 'sm' }: { hazard: HazardType | null; size?: 'sm' | 'lg' }) {
  return (
    <span className={`${styles.hazard} ${hazard ? styles.hazardOn : ''} ${size === 'lg' ? styles.lg : ''}`}>
      {hazardLabel(hazard)}
    </span>
  );
}

/** 오탐 판정 표시 ("오탐 · 집계 제외"). */
export function FalsePositiveTag({ size = 'sm', children = '오탐' }: { size?: 'sm' | 'lg'; children?: string }) {
  return <span className={`${styles.fp} ${size === 'lg' ? styles.lg : ''}`}>{children}</span>;
}
