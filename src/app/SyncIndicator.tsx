import { useRetrySync, useSyncStatus } from '@/api/queries';
import { formatSyncTime } from '@/domain/format';
import { Button } from '@/ui/Button';
import styles from './TopBar.module.css';

/** 상단 바 오른쪽 동기화 상태: 완료 / 진행 중 / 실패 (States.dc.html). */
export function SyncIndicator() {
  const { data: sync, isError } = useSyncStatus();
  const retry = useRetrySync();

  if (isError) {
    return (
      <div role="status" className={styles.sync}>
        <span className={styles.syncState}>
          <WarnIcon />
          서버 연결 실패
        </span>
      </div>
    );
  }
  if (!sync) return <div className={styles.sync} />;

  if (sync.state === 'syncing') {
    const pct = sync.total > 0 ? Math.round((sync.done / sync.total) * 100) : 0;
    return (
      <div role="status" className={styles.sync}>
        <span className={styles.syncState}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className={styles.spin}>
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="var(--pw-topbar-divider)" strokeWidth="2" />
            <path
              d="M8 1.5a6.5 6.5 0 016.5 6.5"
              fill="none"
              stroke="var(--pw-brand)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          동기화 중
        </span>
        <span className={styles.syncMeta}>
          이미지{' '}
          <span className={`mono ${styles.syncValue}`}>
            {sync.done} / {sync.total}
          </span>
          <span
            className={styles.progress}
            role="progressbar"
            aria-label="동기화 진행률"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <span style={{ width: `${pct}%` }} />
          </span>
        </span>
      </div>
    );
  }

  if (sync.state === 'failed') {
    return (
      <div role="status" className={`${styles.sync} ${styles.syncFailed}`}>
        <span className={styles.syncState}>
          <WarnIcon />
          동기화 실패
        </span>
        <span className={styles.syncMeta}>{sync.reason}</span>
        <Button variant="ghost" className={styles.retry} disabled={retry.isPending} onClick={() => retry.mutate()}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div role="status" className={styles.sync}>
      <span className={styles.syncState}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="var(--pw-brand)" />
          <path
            d="M4.5 8.2l2.3 2.3 4.7-4.8"
            fill="none"
            stroke="var(--pw-text-on-light)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        동기화 완료
      </span>
      {sync.lastSyncedAt && (
        <>
          <span className={styles.syncDivider} aria-hidden="true" />
          <span className={styles.syncMeta}>
            마지막 동기화 <span className={`mono ${styles.syncValue}`}>{formatSyncTime(sync.lastSyncedAt)}</span>
          </span>
        </>
      )}
    </div>
  );
}

function WarnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.5L15 14H1z" fill="var(--pw-danger-line)" />
      <path d="M8 6v3.5" stroke="var(--pw-text-on-light)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="11.6" r="1" fill="var(--pw-text-on-light)" />
    </svg>
  );
}
