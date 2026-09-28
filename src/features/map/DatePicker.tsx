import { useId } from 'react';
import { useDriveDates } from '@/api/queries';
import { formatDateLabel, isDateString } from '@/domain/format';
import { Icon } from '@/ui/Icon';
import { Picker, type PickerOption } from '@/ui/Picker';
import styles from './MapPage.module.css';

/** 기준 날짜 선택. 기록이 있는 날짜를 보여 주고, 아래에서 직접 고를 수도 있다. */
export function DatePicker({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const { data: dates = [] } = useDriveDates();
  const inputId = useId();
  const options: PickerOption<string>[] = dates.map((d) => ({
    value: d.date,
    label: formatDateLabel(d.date),
    meta: `${d.recordCount}건`,
  }));

  return (
    <Picker
      label="기준 날짜"
      value={value}
      display={formatDateLabel(value)}
      icon={<Icon name="calendar" />}
      options={options}
      onChange={onChange}
      emptyText="동기화된 주행 기록이 없습니다"
      footer={
        <label htmlFor={inputId} className={styles.dateInputRow}>
          직접 선택
          <input
            id={inputId}
            type="date"
            className={styles.dateInput}
            value={value}
            onChange={(e) => {
              if (isDateString(e.target.value)) onChange(e.target.value);
            }}
          />
        </label>
      }
    />
  );
}
