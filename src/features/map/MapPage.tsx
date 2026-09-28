import { useEffect, useMemo, useState } from 'react';
import { useDriveDates, useDrives, useRecords } from '@/api/queries';
import { formatDateLabel } from '@/domain/format';
import { GRADE_LABEL, HAZARD_LABEL, STATUS_LABEL } from '@/domain/labels';
import { applyFilters, countByGrade, exportableRecords, type RecordFilters } from '@/domain/records';
import { Button } from '@/ui/Button';
import { EmptyState, Loading } from '@/ui/EmptyState';
import { KpiBar } from './KpiBar';
import styles from './MapPage.module.css';
import { PoleMap } from './PoleMap';
import { RecordList } from './RecordList';
import { SummaryCard } from './SummaryCard';
import { useMapParams } from './useMapParams';

/** 화면 A. 지도·목록 */
export function MapPage() {
  const { date, filters, selectedId, setDate, setFilters, resetFilters, select } = useMapParams();
  const recordsQuery = useRecords(date);
  const drivesQuery = useDrives(date);
  const { data: driveDates } = useDriveDates();

  const all = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data]);
  // KPI는 오탐 제외, 목록 세그먼트는 보이는 행 수와 맞춰 오탐 포함.
  const counts = useMemo(() => countByGrade(all), [all]);
  const segmentCounts = useMemo(() => countByGrade(all, { includeFalsePositives: true }), [all]);
  const exportList = useMemo(() => exportableRecords(all), [all]);
  const visible = useMemo(() => applyFilters(all, filters), [all, filters]);
  // 등급 필터는 지도와 목록에 함께 적용된다. 선택은 필터에 걸러지면 카드도 닫힌다.
  const selected = visible.find((r) => r.id === selectedId) ?? null;

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Esc: 선택 해제 (입력 중이거나 펼친 목록이 있으면 그쪽이 먼저 처리한다).
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === 'Escape' && !(t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName))) select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, select]);

  const latestOtherDate = driveDates?.find((d) => d.recordCount > 0 && d.date !== date)?.date;

  let empty;
  if (recordsQuery.isPending) {
    empty = <Loading />;
  } else if (recordsQuery.isError) {
    empty = (
      <EmptyState
        icon="error"
        title="기록을 불러오지 못했습니다"
        action={<Button onClick={() => void recordsQuery.refetch()}>다시 불러오기</Button>}
      >
        서버 연결을 확인하세요. {recordsQuery.error.message}
      </EmptyState>
    );
  } else if (all.length === 0) {
    empty = (
      <EmptyState
        icon="pole"
        title="기록된 전주가 없습니다"
        action={latestOtherDate && <Button onClick={() => setDate(latestOtherDate)}>최근 기록 날짜로 이동</Button>}
      >
        차량이 복귀해 Wi-Fi에 연결되면 그날 기록이 자동으로 들어옵니다. 다른 날짜를 보려면 상단의 기준 날짜를 바꾸세요.
      </EmptyState>
    );
  } else {
    empty = (
      <EmptyState
        icon="filter"
        title="조건에 맞는 전주가 없습니다"
        action={
          <Button variant="inverse" onClick={resetFilters}>
            필터 초기화
          </Button>
        }
      >
        {describeFilters(filters)} 조합에 해당하는 기록이 없습니다.
      </EmptyState>
    );
  }

  return (
    <div className={styles.page}>
      <KpiBar date={date} onDateChange={setDate} counts={recordsQuery.isSuccess ? counts : null} />
      <div className={styles.body}>
        <PoleMap
          drives={drivesQuery.data ?? []}
          records={visible}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={select}
          onHover={setHoveredId}
        >
          {selected && <SummaryCard key={selected.id} record={selected} onClose={() => select(null)} />}
        </PoleMap>
        <RecordList
          date={date}
          records={visible}
          counts={segmentCounts}
          exportRecords={exportList}
          filters={filters}
          onFiltersChange={setFilters}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={select}
          onHover={setHoveredId}
          showFilters={all.length > 0}
          dateLabel={formatDateLabel(date)}
          empty={empty}
        />
      </div>
    </div>
  );
}

/** "위험 · 철거 완료" 처럼 걸려 있는 필터를 이어 붙인다. */
function describeFilters(f: RecordFilters): string {
  const parts = [
    f.grade !== 'all' ? GRADE_LABEL[f.grade] : null,
    f.hazard !== 'all' ? HAZARD_LABEL[f.hazard] : null,
    f.status !== 'all' ? STATUS_LABEL[f.status] : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : '현재 필터';
}
