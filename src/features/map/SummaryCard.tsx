import { useUpdateRecord } from '@/api/queries';
import { routes } from '@/app/routes';
import { formatCoord, formatTime } from '@/domain/format';
import { GRADE_LABEL, hazardLabel, poleIdLabel } from '@/domain/labels';
import { canToggleConfirm, isFalsePositive, toggleConfirm } from '@/domain/records';
import type { PoleRecord } from '@/domain/types';
import { Button, ButtonLink } from '@/ui/Button';
import { GradeGlyph } from '@/ui/GradeGlyph';
import { Icon } from '@/ui/Icon';
import { FalsePositiveTag, StatusPill } from '@/ui/Pills';
import styles from './SummaryCard.module.css';

/** 지도 오른쪽 위: 선택한 전주 요약 카드 (360px). */
export function SummaryCard({ record, onClose }: { record: PoleRecord; onClose: () => void }) {
  const update = useUpdateRecord(record.id);
  const confirmable = canToggleConfirm(record.status);
  const confirmed = record.status === 'checked';

  return (
    <article aria-label="선택한 전주" className={styles.card}>
      <div className={styles.head}>
        <GradeGlyph grade={record.grade} />
        <span className={`${styles.grade} ${styles[record.grade]}`}>{GRADE_LABEL[record.grade]}</span>
        <span className={`mono ${styles.id} ${record.poleId ? '' : styles.unassigned}`}>
          {poleIdLabel(record.poleId)}
        </span>
        {isFalsePositive(record) && <FalsePositiveTag />}
        <Button variant="ghost" iconOnly aria-label="선택 해제" className={styles.close} onClick={onClose}>
          <Icon name="close" />
        </Button>
      </div>

      <div className={styles.body}>
        <img className={styles.thumb} src={record.thumbnailUrl} alt="판정 썸네일" width={136} height={102} />
        <dl className={styles.facts}>
          <dt>좌표</dt>
          <dd className="mono">{record.position ? formatCoord(record.position) : '위치 없음 (GPS 미수신)'}</dd>
          <dt>위험 유형</dt>
          <dd>{hazardLabel(record.hazard)}</dd>
          <dt>기록 시각</dt>
          <dd className="mono">{formatTime(record.recordedAt)}</dd>
          <dt>처리 상태</dt>
          <dd>
            <StatusPill status={record.status} />
          </dd>
        </dl>
      </div>

      {!record.position && (
        <p className={styles.notice}>
          <Icon name="info" size={16} />
          GPS 신호를 받지 못한 기록이라 지도에는 표시되지 않습니다. 상세 화면에서 크롭 이미지로 판정은 할 수 있습니다.
        </p>
      )}

      <div className={styles.actions}>
        <ButtonLink variant="primary" to={routes.pole(record.id)}>
          상세 보기
          <Icon name="chevronRight" size={14} />
        </ButtonLink>
        <button
          type="button"
          className={styles.confirm}
          aria-pressed={confirmable ? confirmed : undefined}
          disabled={!confirmable || update.isPending}
          title={confirmable ? undefined : '신규·확인 상태에서만 바꿀 수 있습니다'}
          onClick={() => update.mutate({ record, patch: { status: toggleConfirm(record.status) } })}
        >
          <Icon name="check" size={14} />
          {confirmed ? '확인됨' : '확인 처리'}
        </button>
      </div>
      {update.isError && (
        <p role="alert" className={styles.error}>
          저장하지 못했습니다. 다시 시도하세요.
        </p>
      )}
    </article>
  );
}
