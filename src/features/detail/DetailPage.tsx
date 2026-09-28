import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { isNotFound } from '@/api/HailMaryApi';
import { useRecord, useRecords } from '@/api/queries';
import { useNavMemory } from '@/app/navMemory';
import { routes } from '@/app/routes';
import { ALL_DATES, dateOf, isAllDates } from '@/domain/format';
import { GRADE_LABEL, poleIdLabel } from '@/domain/labels';
import { dangerQueuePosition, isFalsePositive } from '@/domain/records';
import type { PoleRecord } from '@/domain/types';
import { Button, ButtonLink } from '@/ui/Button';
import { EmptyState, Loading } from '@/ui/EmptyState';
import { GradeGlyph } from '@/ui/GradeGlyph';
import { Icon } from '@/ui/Icon';
import { FalsePositiveTag, HazardTag } from '@/ui/Pills';
import { CropViewer } from './CropViewer';
import styles from './DetailPage.module.css';
import { HistoryCard, RecordInfoCard, ReviewCard, StatusCard } from './InfoCards';

/** 화면 B. 전주 상세·검수 */
export function DetailPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const query = useRecord(recordId);

  if (query.isPending) return <Loading />;
  if (query.isError) {
    return (
      <div className={styles.center}>
        <EmptyState
          icon={isNotFound(query.error) ? 'filter' : 'error'}
          title={isNotFound(query.error) ? '기록을 찾을 수 없습니다' : '기록을 불러오지 못했습니다'}
          action={
            <ButtonLink to={routes.map()} variant="secondary">
              지도로
            </ButtonLink>
          }
        >
          {isNotFound(query.error) ? '삭제되었거나 주소가 잘못되었습니다.' : query.error.message}
        </EmptyState>
      </div>
    );
  }
  return <Detail record={query.data} />;
}

function Detail({ record }: { record: PoleRecord }) {
  const navigate = useNavigate();
  const date = dateOf(record.recordedAt);
  const { seedMap, mapDate } = useNavMemory();
  // 지도에서 전체 기간을 보고 있었으면 위험 전주 이동·돌아가기도 전체 기간으로
  const scope = mapDate && isAllDates(mapDate) ? ALL_DATES : date;
  const { data: sameDay } = useRecords(scope);
  useEffect(() => seedMap(date, record.id), [seedMap, date, record.id]);
  const queue = useMemo(() => (sameDay ? dangerQueuePosition(sameDay, record.id) : null), [sameDay, record.id]);

  // [ / ] 로 이전·다음 위험 전주
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
      const target = e.key === '[' ? queue?.prevId : e.key === ']' ? queue?.nextId : null;
      if (target) navigate(routes.pole(target));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [queue, navigate]);

  return (
    <div className={styles.page}>
      <div className={styles.subheader}>
        <ButtonLink variant="quiet" to={routes.map({ date: scope, sel: record.id })}>
          <Icon name="chevronLeft" />
          지도
        </ButtonLink>
        <span className={styles.vdivider} aria-hidden="true" />
        <h1 className={`mono ${styles.poleId} ${record.poleId ? '' : styles.unassigned}`}>
          {poleIdLabel(record.poleId)}
        </h1>
        <span className={styles.gradeBadge} data-grade={record.grade}>
          <GradeGlyph grade={record.grade} size="sm" />
          {GRADE_LABEL[record.grade]}
        </span>
        {record.hazard && <HazardTag hazard={record.hazard} size="lg" />}
        {isFalsePositive(record) && <FalsePositiveTag size="lg">오탐 · 집계 제외</FalsePositiveTag>}

        <div className={styles.spacer} />
        {queue && queue.total > 0 && (
          <>
            <span className={styles.queue}>
              위험 전주{' '}
              <span className={`tabular ${styles.queueValue}`}>
                {queue.index >= 0 ? `${queue.index + 1} / ${queue.total}` : `${queue.total}건`}
              </span>
            </span>
            <div className={styles.queueNav}>
              <Button
                iconOnly
                aria-label="이전 위험 전주"
                title="이전 위험 전주 ( [ )"
                disabled={!queue.prevId}
                onClick={() => queue.prevId && navigate(routes.pole(queue.prevId))}
              >
                <Icon name="chevronLeft" />
              </Button>
              <Button
                disabled={!queue.nextId}
                title="다음 위험 전주 ( ] )"
                onClick={() => queue.nextId && navigate(routes.pole(queue.nextId))}
              >
                다음 위험 전주
                <Icon name="chevronRight" />
              </Button>
            </div>
          </>
        )}
      </div>

      <div className={styles.body}>
        {/* 기록이 바뀌면 크롭 번호·확대 상태를 처음으로 */}
        <CropViewer key={record.id} crops={record.crops} />
        <div className={styles.cards}>
          <RecordInfoCard record={record} />
          <ReviewCard record={record} />
          <StatusCard record={record} />
          <HistoryCard record={record} recordDate={date} />
        </div>
      </div>
    </div>
  );
}
