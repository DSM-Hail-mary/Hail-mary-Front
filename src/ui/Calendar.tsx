import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import styles from './Calendar.module.css';
import { addDays, monthGrid, monthKey, shiftMonth } from './calendarGrid';
import { Icon } from './Icon';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 다크 테마 달력 (브라우저 기본 date input 달력 대체).
 * 기록이 있는 날은 점으로 표시한다. ←/→/↑/↓ 로 이동, Enter로 선택.
 */
export function Calendar({
  value,
  today,
  marked,
  onChange,
}: {
  value: string;
  today: string;
  /** 기록이 있는 날짜 → 건수 */
  marked: ReadonlyMap<string, number>;
  onChange: (date: string) => void;
}) {
  // 고른 날짜가 없으면(전체 기간) 오늘이 있는 달부터
  const start = value || today;
  const [month, setMonth] = useState(monthKey(start));
  const [focus, setFocus] = useState(start);
  const gridRef = useRef<HTMLDivElement>(null);
  const focusByKey = useRef(false);

  // 키보드로 옮긴 날짜에 포커스 (다른 달로 넘어가면 그 달을 보여 준다)
  useEffect(() => {
    if (!focusByKey.current) return;
    focusByKey.current = false;
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${focus}"]`)?.focus();
  }, [focus, month]);

  const move = (n: number) => {
    const next = addDays(focus, n);
    focusByKey.current = true;
    setFocus(next);
    if (monthKey(next) !== month) setMonth(monthKey(next));
  };

  const onKey = (e: KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) {
      e.preventDefault();
      move(step);
    }
  };

  const [y, m] = month.split('-').map(Number);

  return (
    <div className={styles.calendar}>
      <div className={styles.head}>
        <button
          type="button"
          className={styles.nav}
          aria-label="이전 달"
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <Icon name="chevronLeft" size={14} />
        </button>
        <span className={styles.title} aria-live="polite">
          {y}년 {m}월
        </span>
        <button
          type="button"
          className={styles.nav}
          aria-label="다음 달"
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <Icon name="chevronRight" size={14} />
        </button>
      </div>
      <div className={styles.weekdays} aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div ref={gridRef} role="group" aria-label={`${y}년 ${m}월`} className={styles.grid} onKeyDown={onKey}>
        {monthGrid(month).map((d) => {
          const count = marked.get(d);
          const outside = monthKey(d) !== month;
          const day = Number(d.slice(8));
          return (
            <button
              key={d}
              type="button"
              data-date={d}
              tabIndex={d === focus ? 0 : -1}
              className={styles.day}
              data-outside={outside || undefined}
              data-today={d === today || undefined}
              aria-pressed={d === value}
              aria-label={`${Number(d.slice(0, 4))}년 ${Number(d.slice(5, 7))}월 ${day}일${count ? `, 기록 ${count}건` : ''}`}
              onClick={() => onChange(d)}
              onFocus={() => setFocus(d)}
            >
              {day}
              {count ? <span className={styles.dot} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      <div className={styles.foot}>
        <span className={styles.legend}>
          <span className={styles.dot} aria-hidden="true" />
          기록 있는 날
        </span>
        <button type="button" className={styles.todayButton} onClick={() => onChange(today)}>
          오늘
        </button>
      </div>
    </div>
  );
}
