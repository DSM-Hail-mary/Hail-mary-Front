import type { ReactNode } from 'react';
import { Picker } from './Picker';
import styles from './controls.module.css';

export interface Option<T extends string> {
  value: T;
  label: string;
}

/**
 * 라벨이 위에 붙은 셀렉트 (목록 필터). 브라우저 기본 드롭다운은 운영체제 스타일(흰 바탕)로 떠서
 * 디자인과 맞지 않으므로, 기준 날짜와 같은 펼침 목록(Picker)을 쓴다.
 */
export function LabeledSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  align,
}: {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  align?: 'left' | 'right';
}) {
  return (
    <Picker
      size="sm"
      label={label}
      value={value}
      display={options.find((o) => o.value === value)?.label ?? ''}
      options={options}
      onChange={onChange}
      align={align}
    />
  );
}

export interface Segment<T extends string> {
  value: T;
  label: ReactNode;
  /** 라벨 옆 작은 숫자. */
  count?: number;
}

/** 세그먼트 버튼 묶음 (등급 필터). 선택된 칸은 올라온 면. */
export function SegmentedControl<T extends string>({
  label,
  value,
  segments,
  onChange,
}: {
  label: string;
  value: T;
  segments: readonly Segment<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={styles.segmented}
      style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}
    >
      {segments.map((s) => (
        <button
          key={s.value}
          type="button"
          aria-pressed={s.value === value}
          className={styles.segment}
          onClick={() => onChange(s.value)}
        >
          {s.label}
          {s.count !== undefined && <span className={styles.segmentCount}>{s.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** 켜기/끄기 스위치 (검출 박스). */
export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={styles.switch}
      onClick={() => onChange(!checked)}
    >
      {label}
      <span className={styles.track} data-on={checked}>
        <span className={styles.knob} />
      </span>
    </button>
  );
}
