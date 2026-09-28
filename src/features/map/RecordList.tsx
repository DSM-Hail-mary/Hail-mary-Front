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
  /** CSV로 내보낼 기록 (명세서 4.6: 그날 위험 전주, 오탐 제외). 목록 필터와 무관하다. */
  exportRecords: readonly PoleRecord[];
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
  exportRecords,
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
  // 첫 표시(?sel= 로 들어온 경우), 선택 변경, 목록 내용 변경(로딩 완료·필터) 때마다 확인한다.
  const selectionKey = `${selectedId}|${records.length}|${records[0]?.id ?? ''}`;
  const [seenKey, setSeenKey] = useState<string | null>(null);
  if (seenKey !== selectionKey) {
    setSeenKey(selectionKey);
    const target = selectedId ? pageOf(records, selectedId, pageSize) : null;
    if (target && target !== page) setPage(target);
  }

  const view = paginate(records, page, pageSize);

  useEffect(() => {
    if (!selectedId) return;
    // 목록 상자 안에서만 스크롤한다 (scrollIntoView는 페이지 전체까지 움직여 모바일에서 지도가 밀려난다).
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-record-id="${CSS.escape(selectedId)}"]`);
    if (!list || !row || list.scrollHeight <= list.clientHeight) return;
    const top = row.offsetTop; // .list가 position: relative라 목록 기준 위치
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top + row.offsetHeight - list.clientHeight;
    }
  }, [selectedId, view.page, records.length]);

  // ↑/↓: 목록 안에서 선택을 옮긴다 (페이지 경계도 넘는다).
  // 키를 빠르게 연달아 누르면 선택이 화면에 반영되기 전에 다음 키가 오므로, 마지막 이동 위치를 따로 기억한다.
  const cursor = useRef(selectedId);
  useEffect(() => {
    cursor.current = selectedId;
  }, [selectedId]);
  const onListKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const idx = cursor.current ? records.findIndex((r) => r.id === cursor.current) : -1;
    const next = records[e.key === 'ArrowDown' ? Math.min(records.length - 1, idx + 1) : Math.max(0, idx - 1)];
    if (!next) return;
    cursor.current = next.id;
    onSelect(next.id);
    requestAnimationFrame(() =>
      listRef.current?.querySelector<HTMLElement>(`[data-record-id="${CSS.escape(next.id)}"]`)?.focus(),
    );
  };

  const exportCsv = () => downloadCsv(`polewatch_${date}.csv`, recordsToCsv(exportRecords));

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
              disabled={exportRecords.length === 0}
              onClick={exportCsv}
              title={`그날 위험 전주 ${exportRecords.length}건 (오탐 제외)을 CSV로 저장`}
            >
              <Icon name="download" size={14} />
              위험 전주 CSV
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
