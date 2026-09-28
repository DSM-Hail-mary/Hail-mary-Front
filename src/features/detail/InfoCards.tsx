import { useUpdateRecord } from '@/api/queries';
import { formatCoord, formatDateTime } from '@/domain/format';
import {
  BASIS_LEVEL_GRADE,
  BASIS_LEVEL_LABEL,
  BASIS_METRIC_LABEL,
  GRADE_LABEL,
  STATUS_FLOW,
  STATUS_LABEL,
  hazardLabel,
  headingLabel,
} from '@/domain/labels';
import { historySummary, previousStatus } from '@/domain/records';
import type { BasisLevel, PoleRecord, ReviewResult } from '@/domain/types';
import { Button } from '@/ui/Button';
import { Card, Inset } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import styles from './InfoCards.module.css';

const LEVELS: BasisLevel[] = [0, 1, 2];

/** 기록 정보: 좌표 · 시각 · 유형 · 진행 방향 + 등급 근거 3단 게이지. */
export function RecordInfoCard({ record }: { record: PoleRecord }) {
  const basis = record.basis;
  return (
    <Card title="기록 정보">
      <dl className={styles.facts}>
        <div>
          <dt>GPS 좌표</dt>
          <dd className="mono">{record.position ? formatCoord(record.position) : '위치 없음 (GPS 미수신)'}</dd>
        </div>
        <div>
          <dt>기록 시각</dt>
          <dd className="mono">{formatDateTime(record.recordedAt)}</dd>
        </div>
        <div>
          <dt>위험 유형</dt>
          <dd>{hazardLabel(record.hazard)}</dd>
        </div>
        <div>
          <dt>진행 방향</dt>
          <dd className={styles.heading}>
            {record.headingDeg != null && (
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="7" fill="none" stroke="var(--pw-outline-subtle)" strokeWidth="1.2" />
                <path
                  d="M8 3.5l3 6.5-3-1.8-3 1.8z"
                  fill="currentColor"
                  transform={`rotate(${record.headingDeg} 8 8)`}
                />
              </svg>
            )}
            {headingLabel(record.headingDeg)}
          </dd>
        </div>
      </dl>
      {basis && (
        <div className={styles.basis}>
          <div className={styles.basisHead}>
            <span className={styles.label}>등급 근거</span>
            <span className={styles.basisText}>
              {BASIS_METRIC_LABEL[basis.metric]} {BASIS_LEVEL_LABEL[basis.metric][basis.level]} →{' '}
              {GRADE_LABEL[record.grade]}
            </span>
          </div>
          <div
            role="img"
            aria-label={`${BASIS_METRIC_LABEL[basis.metric]}: ${LEVELS.map((l) => BASIS_LEVEL_LABEL[basis.metric][l]).join(', ')} 중 ${BASIS_LEVEL_LABEL[basis.metric][basis.level]}`}
            className={styles.gauge}
          >
            {LEVELS.map((l) => {
              const on = l === basis.level;
              const grade = BASIS_LEVEL_GRADE[l];
              return (
                <div key={l} className={styles.step} data-on={on || undefined} data-grade={grade}>
                  <span className={styles.bar} />
                  <span className={styles.stepLabel}>
                    {BASIS_LEVEL_LABEL[basis.metric][l]} · {GRADE_LABEL[grade]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

/** 판정 검수: 맞음 / 오탐. 누른 쪽이 밝은 면으로 반전되고 선택 취소할 수 있다. */
export function ReviewCard({ record }: { record: PoleRecord }) {
  const update = useUpdateRecord(record.id);
  const set = (review: ReviewResult | null) => update.mutate({ record, patch: { review } });
  const option = (value: ReviewResult, label: string, icon: 'check' | 'cross') => (
    <button
      type="button"
      aria-pressed={record.review === value}
      className={styles.reviewButton}
      onClick={() => set(record.review === value ? null : value)}
    >
      <Icon name={icon} />
      {label}
    </button>
  );

  return (
    <Card title="판정 검수" aside={record.review ? '검수 완료' : '미검수 · 판정이 맞는지 확인하세요'}>
      <div className={styles.reviewButtons}>
        {option('correct', '맞음', 'check')}
        {option('false_positive', '오탐', 'cross')}
      </div>
      {record.review === 'false_positive' && (
        <Inset role="status" className={styles.notice}>
          <Icon name="folder" size={18} />
          <p>
            크롭 {record.crops.length}장을 재학습용 폴더에 저장합니다. 지도와 목록에는 오탐으로 표시되고 집계에서
            빠집니다.
          </p>
          <Button variant="ghost" className={styles.undoReview} onClick={() => set(null)}>
            선택 취소
          </Button>
        </Inset>
      )}
      {record.review === 'correct' && (
        <Inset role="status" className={`${styles.notice} ${styles.noticeOk}`}>
          <p>판정이 맞음으로 기록됐습니다.</p>
          <Button variant="ghost" className={styles.undoReview} onClick={() => set(null)}>
            선택 취소
          </Button>
        </Inset>
      )}
      {update.isError && (
        <p role="alert" className={styles.error}>
          저장하지 못했습니다. 다시 시도하세요.
        </p>
      )}
    </Card>
  );
}

/** 처리 상태: 신규 → 확인 → 철거 예정 → 철거 완료. 단계를 눌러 바꾸고 한 단계씩 되돌린다. */
export function StatusCard({ record }: { record: PoleRecord }) {
  const update = useUpdateRecord(record.id);
  const status = record.status;
  const current = status ? STATUS_FLOW.indexOf(status) : -1;

  return (
    <Card
      title="처리 상태"
      actions={
        status && (
          <Button
            variant="ghost"
            className={styles.undo}
            disabled={current <= 0 || update.isPending}
            onClick={() => update.mutate({ record, patch: { status: previousStatus(status) } })}
          >
            <Icon name="undo" size={14} />
            되돌리기
          </Button>
        )
      }
    >
      {status ? (
        <div role="group" aria-label="처리 단계" className={styles.stepper}>
          <span className={styles.track} aria-hidden="true" />
          <span
            className={styles.progress}
            aria-hidden="true"
            style={{ width: `${(75 * current) / (STATUS_FLOW.length - 1)}%` }}
          />
          {STATUS_FLOW.map((s, i) => {
            const state = i < current ? 'done' : i === current ? 'current' : 'todo';
            return (
              <button
                key={s}
                type="button"
                className={styles.stepButton}
                data-state={state}
                aria-current={state === 'current' ? 'step' : undefined}
                disabled={update.isPending}
                onClick={() => i !== current && update.mutate({ record, patch: { status: s } })}
              >
                <span className={styles.dot}>{state === 'done' ? <Icon name="check" size={14} /> : i + 1}</span>
                <span className={styles.stepName}>{STATUS_LABEL[s]}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className={styles.muted}>양호 판정이라 처리할 항목이 없습니다.</p>
      )}
      {update.isError && (
        <p role="alert" className={styles.error}>
          저장하지 못했습니다. 다시 시도하세요.
        </p>
      )}
    </Card>
  );
}

/** 이력 비교: 이전 방문 / 오늘 썸네일과 등급 근거 변화. */
export function HistoryCard({ record, recordDate }: { record: PoleRecord; recordDate: string }) {
  const prev = record.previousVisit;
  const metric = record.basis?.metric ?? prev?.basis?.metric;
  const levelText = (level: BasisLevel | undefined) =>
    metric && level !== undefined ? BASIS_LEVEL_LABEL[metric][level] : '없음';
  const summary = historySummary(record, recordDate);

  return (
    <Card title="이력 비교">
      {prev ? (
        <>
          <div className={styles.compare}>
            <figure>
              <img src={prev.thumbnailUrl} alt="이전 방문 썸네일" loading="lazy" />
              <figcaption>
                <span>이전 방문</span>
                <span className="mono">{prev.date}</span>
              </figcaption>
            </figure>
            <figure className={styles.today}>
              <img src={record.thumbnailUrl} alt="이번 방문 썸네일" loading="lazy" />
              <figcaption>
                <span>이번</span>
                <span className="mono">{recordDate}</span>
              </figcaption>
            </figure>
          </div>
          {metric && (
            <Inset className={styles.change}>
              <span className={styles.label}>{BASIS_METRIC_LABEL[metric]}</span>
              <span className={styles.from}>{levelText(prev.basis?.level)}</span>
              <Icon name="arrowRight" aria-label="에서" />
              <span className={styles.to} data-grade={record.grade}>
                {levelText(record.basis?.level)}
              </span>
              {summary && <span className={styles.summary}>{summary}</span>}
            </Inset>
          )}
        </>
      ) : (
        <p className={styles.muted}>이전 기록 없음 · 이 전주를 처음 지나간 기록입니다.</p>
      )}
    </Card>
  );
}
