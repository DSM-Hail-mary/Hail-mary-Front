import { useMemo } from 'react';
import { useDriveDates } from '@/api/queries';
import { formatDateLabel, today } from '@/domain/format';
import { Calendar } from '@/ui/Calendar';
import { Icon } from '@/ui/Icon';
import { Picker, type PickerOption } from '@/ui/Picker';

/** 최근 기록 날짜 바로가기 개수. 나머지는 아래 달력에서 고른다. */
const RECENT = 5;

/** 기준 날짜 선택: 최근 기록 날짜 목록 + 달력 (기록 있는 날 점 표시). */
export function DatePicker({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const { data: dates = [] } = useDriveDates();
  const marked = useMemo(() => new Map(dates.map((d) => [d.date, d.recordCount])), [dates]);
  const options: PickerOption<string>[] = dates.slice(0, RECENT).map((d) => ({
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
      footer={<Calendar value={value} today={today()} marked={marked} onChange={onChange} />}
    />
  );
}
