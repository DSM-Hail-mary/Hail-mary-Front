import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

type Illustration = 'pole' | 'filter' | 'error';

const ILLUSTRATIONS: Record<Illustration, ReactNode> = {
  pole: (
    <>
      <rect x="26" y="14" width="4" height="28" fill="currentColor" />
      <rect x="17" y="18" width="22" height="3.5" rx="1" fill="currentColor" />
      <path d="M14 44h28" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
    </>
  ),
  filter: (
    <path d="M16 18h24l-9 11v9l-6 3V29z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
  ),
  error: (
    <>
      <path d="M28 15l14 25H14z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M28 24v7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="28" cy="35" r="1.4" fill="currentColor" />
    </>
  ),
};

/** 빈 상태·오류 안내 (States.dc.html). 가운데 정렬 아이콘 + 제목 + 설명 + 동작. */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: Illustration;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={styles.root} role="status">
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" className={styles.icon}>
        <circle cx="28" cy="28" r="27" fill="var(--pw-empty-icon-bg)" />
        {ILLUSTRATIONS[icon]}
      </svg>
      <p className={styles.title}>{title}</p>
      {children && <p className={styles.body}>{children}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

/** 불러오는 중 표시. 자리만 잡고 조용히 둔다. */
export function Loading({ label = '불러오는 중' }: { label?: string }) {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      {label}
    </div>
  );
}
