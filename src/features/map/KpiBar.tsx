import { GRADES, GRADE_LABEL } from '@/domain/labels';
import type { GradeCounts } from '@/domain/records';
import { GradeGlyph } from '@/ui/GradeGlyph';
import { DatePicker } from './DatePicker';
import styles from './MapPage.module.css';

/** KPI 줄: 기준 날짜 | 기록 전주 · 위험 · 주의 · 양호 (오탐 제외). */
export function KpiBar({
  date,
  onDateChange,
  counts,
}: {
  date: string;
  onDateChange: (date: string) => void;
  /** 로딩 중이면 null → "–" 표시 (0으로 지어내지 않음). */
  counts: GradeCounts | null;
}) {
  const value = (n: number | undefined) => (counts ? n : '–');
  return (
    <section aria-label="요약" className={styles.kpiBar}>
      <DatePicker value={date} onChange={onDateChange} />
      <div className={styles.kpiDivider} aria-hidden="true" />
      <dl className={styles.kpis}>
        <div className={styles.kpi}>
          <dt className={styles.kpiLabel}>기록 전주</dt>
          <dd className={styles.kpiValue}>{value(counts?.total)}</dd>
        </div>
        {GRADES.map((g) => (
          <div key={g} className={styles.kpi}>
            <dt className={styles.kpiLabel}>
              <GradeGlyph grade={g} size="dot" />
              {GRADE_LABEL[g]}
            </dt>
            <dd className={`${styles.kpiValue} ${g === 'danger' ? styles.kpiDanger : ''}`}>{value(counts?.[g])}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
