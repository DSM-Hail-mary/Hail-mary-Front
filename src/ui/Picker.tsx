import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Picker.module.css';

export interface PickerOption<T extends string> {
  value: T;
  label: ReactNode;
  /** 오른쪽에 붙는 보조 정보 (기록 수 등). */
  meta?: ReactNode;
}

/**
 * 라벨 + 트리거 버튼 + 펼침 목록 (기준 날짜, 주행 기록 선택).
 * `footer`에 직접 입력 같은 추가 컨트롤을 넣을 수 있다.
 */
export function Picker<T extends string>({
  label,
  value,
  display,
  icon,
  options,
  onChange,
  footer,
  emptyText = '선택할 항목이 없습니다',
  align = 'left',
  size = 'md',
}: {
  label: string;
  value: T;
  display: ReactNode;
  icon?: ReactNode;
  options: readonly PickerOption<T>[];
  onChange: (value: T) => void;
  /** 목록 아래 추가 컨트롤. 값이 바뀌면 목록은 저절로 닫힌다. */
  footer?: ReactNode;
  emptyText?: string;
  /** 펼침 목록을 트리거의 어느 쪽에 맞출지 (화면 오른쪽 끝이면 right). */
  align?: 'left' | 'right';
  /** sm: 목록 필터 셀렉트 크기 (폭을 꽉 채우고 글자가 작다). */
  size?: 'md' | 'sm';
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const labelId = useId();
  const listId = useId();

  // 값이 바뀌면(목록 선택이든 footer 입력이든) 닫는다.
  const [seenValue, setSeenValue] = useState(value);
  if (seenValue !== value) {
    setSeenValue(value);
    setOpen(false);
  }

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    // 열리면 선택된 항목(없으면 첫 항목)에 포커스
    const list = listRef.current;
    const target =
      list?.querySelector<HTMLElement>('[aria-selected="true"]') ?? list?.querySelector<HTMLElement>('[role="option"]');
    target?.focus();
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const onListKey = (e: KeyboardEvent) => {
    const items = [...(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? Math.min(items.length - 1, idx + 1) : Math.max(0, idx - 1);
      items[next]?.focus();
    }
  };

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${size === 'sm' ? styles.sm : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <span id={labelId} className={styles.label}>
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${labelId}-value`}
        onClick={() => setOpen((o) => !o)}
      >
        {icon}
        <span id={`${labelId}-value`} className={styles.display}>
          {display}
        </span>
        <Icon name="chevronDown" size={12} className={styles.chevron} />
      </button>
      {open && (
        <div className={`${styles.popover} ${align === 'right' ? styles.alignRight : ''}`}>
          {options.length === 0 ? (
            <p className={styles.empty}>{emptyText}</p>
          ) : (
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-labelledby={labelId}
              className={styles.list}
              onKeyDown={onListKey}
            >
              {options.map((o) => (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={o.value === value}
                  tabIndex={-1}
                  className={styles.option}
                  onClick={() => {
                    onChange(o.value);
                    close();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChange(o.value);
                      close();
                    }
                  }}
                >
                  <span>{o.label}</span>
                  {o.meta !== undefined && <span className={styles.meta}>{o.meta}</span>}
                </li>
              ))}
            </ul>
          )}
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      )}
    </div>
  );
}
