import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import styles from './ResizeHandle.module.css';

/**
 * 두 영역 사이의 세로 경계선. 끌어서 오른쪽 패널의 폭을 바꾼다.
 * - 드래그: 왼쪽으로 끌면 패널이 넓어진다
 * - 키보드: 포커스 후 ←/→ (Shift와 함께 누르면 크게)
 * - 더블클릭: 기본 폭으로
 */
export function ResizeHandle({
  width,
  min,
  max,
  defaultWidth,
  onChange,
  label,
}: {
  width: number;
  min: number;
  max: number;
  defaultWidth: number;
  onChange: (width: number) => void;
  label: string;
}) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const clamp = (w: number) => Math.round(Math.min(max, Math.max(min, w)));

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    drag.current = { startX: e.clientX, startWidth: width };
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.dataset.resizing = 'col';
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    // 경계선이 패널 왼쪽에 있으므로 왼쪽으로 끌수록 넓어진다
    onChange(clamp(d.startWidth + (d.startX - e.clientX)));
  };
  const end = () => {
    drag.current = null;
    delete document.body.dataset.resizing;
    setDragging(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 64 : 16;
    if (e.key === 'ArrowLeft') onChange(clamp(width + step));
    else if (e.key === 'ArrowRight') onChange(clamp(width - step));
    else if (e.key === 'Home') onChange(clamp(max));
    else if (e.key === 'End') onChange(clamp(min));
    else return;
    e.preventDefault();
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title="끌어서 폭 조절 · 더블클릭하면 기본 폭"
      className={styles.handle}
      data-dragging={dragging || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={() => onChange(clamp(defaultWidth))}
      onKeyDown={onKeyDown}
    />
  );
}
