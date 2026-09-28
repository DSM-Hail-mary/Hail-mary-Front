import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { config } from '@/config';
import { downloadCsv, recordsToCsv } from '@/domain/csv';
import { formatTime } from '@/domain/format';
import { GRADE_LABEL, HAZARD_LABEL, STATUS_LABEL, poleIdLabel } from '@/domain/labels';
import {
  isFalsePositive,
  pageOf,
  paginate,
  type GradeCounts,
  type HazardFilter,
  type RecordFilters,
  type SortKey,
  type StatusFilter,
} from '@/domain/records';
import type { PoleRecord } from '@/domain/types';
import { Button } from '@/ui/Button';
import { LabeledSelect, SegmentedControl, type Option } from '@/ui/controls';
import { GradeGlyph } from '@/ui/GradeGlyph';
import { Icon } from '@/ui/Icon';
import { FalsePositiveTag, HazardTag, StatusPill } from '@/ui/Pills';
import styles from './RecordList.module.css';

const HAZARD_OPTIONS: Option<HazardFilter>[] = [
  { value: 'all', label: '전체' },
  { value: 'nest', label: HAZARD_LABEL.nest },
  { value: 'tree', label: HAZARD_LABEL.tree },
];

const STATUS_OPTIONS: Option<StatusFilter>[] = [
  { value: 'all', label: '전체' },
  ...(['new', 'checked', 'planned', 'removed'] as const).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
];

const SORT_OPTIONS: Option<SortKey>[] = [
  { value: 'time', label: '기록 시각순' },
  { value: 'priority', label: '우선순위순' },
];

interface Props {
  date: string;
  /** 필터·정렬을 적용한 목록. */
  records: readonly PoleRecord[];
  counts: GradeCounts;
  filters: RecordFilters;
  onFiltersChange: (patch: Partial<RecordFilters>) => void;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  /** 기록이 하나도 없는 날은 필터를 숨기고 날짜만 보여 준다. */
  showFilters: boolean;
  dateLabel: string;
  /** 목록이 비었을 때 보여 줄 내용 (빈 날짜 / 필터 결과 없음). */
  empty: ReactNode;
}

/** 오른쪽 전주 목록 (440px): 제목·CSV / 등급 세그먼트 / 셀렉트 / 행 목록 / 페이지. */
export function RecordList({
  date,
  records,
  counts,
  filters,
  onFiltersChange,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  showFilters,
  dateLabel,
  empty,
}: Props) {
  const pageSize = config.listPageSize;
  const [page, setPage] = useState(1);
  const listRef = useRef<HTMLOListElement>(null);

  // 지도에서 고른 기록이 다른 페이지에 있으면 그 페이지로 넘긴다 (렌더 중 상태 보정).
  const [seenSelection, setSeenSelection] = useState(selectedId);
  if (seenSelection !== selectedId) {
    setSeenSelection(selectedId);
    const target = selectedId ? pageOf(records, selectedId, pageSize) : null;
    if (target && target !== page) setPage(target);
  }

  const view = paginate(records, page, pageSize);

  useEffect(() => {
    if (!selectedId) return;
    const row = listRef.current?.querySelector<HTMLElement>(`[data-record-id="${CSS.escape(selectedId)}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [selectedId, view.page]);

  // ↑/↓: 목록 안에서 선택을 옮긴다 (페이지 경계도 넘는다).
  const onListKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const idx = selectedId ? records.findIndex((r) => r.id === selectedId) : -1;
    const next = records[e.key === 'ArrowDown' ? Math.min(records.length - 1, idx + 1) : Math.max(0, idx - 1)];
    if (!next) return;
    onSelect(next.id);
    requestAnimationFrame(() =>
      listRef.current?.querySelector<HTMLElement>(`[data-record-id="${CSS.escape(next.id)}"]`)?.focus(),
    );
  };

  const exportCsv = () => downloadCsv(`polewatch_${date}.csv`, recordsToCsv(records));

  return (
    <section aria-label="전주 목록" className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>전주 목록</h2>
          <span className={`tabular ${styles.count}`}>{records.length}건</span>
          {!showFilters && <span className={styles.dateLabel}>{dateLabel}</span>}
          {showFilters && (
            <Button
              className={styles.export}
              disabled={records.length === 0}
              onClick={exportCsv}
              title="지금 목록(필터 적용)을 CSV로 저장"
            >
              <Icon name="download" size={14} />
              CSV 내보내기
            </Button>
          )}
        </div>
        {showFilters && (
          <>
            <SegmentedControl
              label="등급 필터"
              value={filters.grade}
              onChange={(grade) => {
                onFiltersChange({ grade });
                setPage(1);
              }}
              segments={[
                { value: 'all', label: '전체', count: counts.total },
                { value: 'danger', label: GRADE_LABEL.danger, count: counts.danger },
                { value: 'warn', label: GRADE_LABEL.warn, count: counts.warn },
                { value: 'ok', label: GRADE_LABEL.ok, count: counts.ok },
              ]}
            />
            <div className={styles.selects}>
              <LabeledSelect
                label="위험 유형"
                value={filters.hazard}
                options={HAZARD_OPTIONS}
                onChange={(hazard) => {
                  onFiltersChange({ hazard });
                  setPage(1);
                }}
              />
              <LabeledSelect
                label="처리 상태"
                value={filters.status}
                options={STATUS_OPTIONS}
                onChange={(status) => {
                  onFiltersChange({ status });
                  setPage(1);
                }}
              />
              <LabeledSelect
                label="정렬"
                value={filters.sort}
                options={SORT_OPTIONS}
                onChange={(sort) => onFiltersChange({ sort })}
              />
            </div>
          </>
        )}
      </div>

      {records.length === 0 ? (
        empty
      ) : (
        <>
          <ol
            ref={listRef}
            className={styles.list}
            onKeyDown={onListKey}
            onMouseLeave={() => onHover(null)}
            aria-label="전주 목록 (↑/↓로 이동, Esc로 선택 해제)"
          >
            {view.items.map((r) => (
              <li key={r.id} className={styles.item}>
                <RecordRow
                  record={r}
                  selected={r.id === selectedId}
                  hovered={r.id === hoveredId}
                  onSelect={onSelect}
                  onHover={onHover}
                />
              </li>
            ))}
          </ol>
          <div className={styles.pager}>
            <span className="tabular">
              {view.start + 1}–{view.end} / {records.length}건
            </span>
            <Button iconOnly aria-label="이전 페이지" disabled={view.page <= 1} onClick={() => setPage(view.page - 1)}>
              <Icon name="chevronLeft" size={14} />
            </Button>
            <Button
              iconOnly
              aria-label="다음 페이지"
              disabled={view.page >= view.pageCount}
              onClick={() => setPage(view.page + 1)}
            >
              <Icon name="chevronRight" size={14} />
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function RecordRow({
  record,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  record: PoleRecord;
  selected: boolean;
  hovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const fp = isFalsePositive(record);
  return (
    <button
      type="button"
      data-record-id={record.id}
      aria-pressed={selected}
      aria-label={`${poleIdLabel(record.poleId)} ${GRADE_LABEL[record.grade]}${fp ? ' 오탐' : ''}`}
      className={`${styles.row} ${fp ? styles.rowFp : ''}`}
      data-hovered={hovered || undefined}
      onClick={() => onSelect(record.id)}
      onMouseEnter={() => onHover(record.id)}
      onFocus={() => onHover(record.id)}
      onBlur={() => onHover(null)}
    >
      <span className={styles.glyphCell}>
        <GradeGlyph grade={record.grade} />
      </span>
      <span className={styles.main}>
        <span className={`mono ${styles.poleId} ${record.poleId ? '' : styles.unassigned}`}>
          {poleIdLabel(record.poleId)}
        </span>
        <span className={styles.meta}>
          <HazardTag hazard={record.hazard} />
          <span className="mono">{formatTime(record.recordedAt)}</span>
          {!record.position && (
            <span className={styles.noLocation}>
              <Icon name="pinOff" size={12} />
              위치 없음
            </span>
          )}
          {fp && <FalsePositiveTag />}
        </span>
      </span>
      <StatusPill status={record.status} />
    </button>
  );
}
