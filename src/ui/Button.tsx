import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'inverse' | 'ghost' | 'quiet';

interface StyleProps {
  variant?: ButtonVariant;
  /** 정사각 44px 아이콘 버튼. */
  iconOnly?: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export function buttonClass({ variant = 'secondary', iconOnly }: StyleProps, extra?: string): string {
  return [styles.button, styles[variant], iconOnly ? styles.iconOnly : '', extra].filter(Boolean).join(' ');
}

/**
 * 공통 버튼. 높이 44px(클릭 대상 최소 크기).
 * - primary: 노랑 (주요 동작, 글자 #141414)
 * - secondary: 테두리 (보조 동작)
 * - inverse: 밝은 면 (빈 상태의 복구 동작)
 * - ghost/quiet: 배경 없음 (툴바, 되돌리기 등)
 */
export function Button({
  variant,
  iconOnly,
  className,
  type = 'button',
  ...rest
}: StyleProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonClass({ variant, iconOnly }, className)} {...rest} />;
}

export function ButtonLink({ variant, iconOnly, className, ...rest }: StyleProps & LinkProps) {
  return <Link className={buttonClass({ variant, iconOnly }, className)} {...rest} />;
}
