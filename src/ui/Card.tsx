import { useId, type ReactNode } from 'react';
import styles from './Card.module.css';

/** 상세·기기 화면의 카드. 제목(15px 700) + 선택적 보조 텍스트/동작. */
export function Card({
  title,
  aside,
  actions,
  children,
  className,
}: {
  title: string;
  aside?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`${styles.card} ${className ?? ''}`}>
      <div className={styles.head}>
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
        {aside && <span className={styles.aside}>{aside}</span>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** 카드 안의 오목한 안내 박스 (페이지 바탕색). */
export function Inset({ children, className, role }: { children: ReactNode; className?: string; role?: string }) {
  return (
    <div role={role} className={`${styles.inset} ${className ?? ''}`}>
      {children}
    </div>
  );
}
