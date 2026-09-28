import { GRADE_CHAR } from '@/domain/labels';
import type { Grade } from '@/domain/types';
import styles from './GradeGlyph.module.css';

export type GlyphSize = 'md' | 'sm' | 'dot';

interface Props {
  grade: Grade;
  /** md: 지도 마커·목록 행, sm: 범례·상세 배지, dot: KPI 라벨 (글자 없음). */
  size?: GlyphSize;
  className?: string;
}

/**
 * 위험 등급 글리프. 색만으로 구분하지 않도록 모양(마름모/원/테두리 원)과
 * 글자(위/주/양)를 함께 쓴다. 등급 이름은 옆 텍스트나 부모의 aria-label이 전달한다.
 */
/** Leaflet divIcon처럼 HTML 문자열이 필요한 곳용. 컴포넌트와 같은 클래스를 쓴다. */
// eslint-disable-next-line react-refresh/only-export-components
export function gradeGlyphHtml(grade: Grade, size: GlyphSize = 'md'): string {
  const cls = [styles.glyph, styles[grade], styles[size]].join(' ');
  const char = size === 'dot' ? '' : `<span class="${styles.char}">${GRADE_CHAR[grade]}</span>`;
  return `<span class="${cls}" aria-hidden="true">${char}</span>`;
}

export function GradeGlyph({ grade, size = 'md', className }: Props) {
  return (
    <span
      className={[styles.glyph, styles[grade], styles[size], className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      {size !== 'dot' && <span className={styles.char}>{GRADE_CHAR[grade]}</span>}
    </span>
  );
}
