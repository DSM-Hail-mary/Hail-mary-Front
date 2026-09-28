import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { axisScale, linear } from './scale';
import styles from './TimeSeriesChart.module.css';

/** 디자인 기준 높이. 부모가 더 크면 늘어난다 (최소 이 값). */
const MIN_HEIGHT = 200;
const M = { top: 12, right: 8, bottom: 24, left: 44 };
const TIP_W = 112;

export interface TimeSeriesChartProps {
  /** 분 단위 값. */
  values: readonly number[];
  /** 값마다 x축·툴팁에 쓸 시각 라벨 ("09:11"). */
  labels: readonly string[];
  kind: 'line' | 'bar';
  /** 툴팁 값 뒤에 붙는 단위. */
  unit: string;
  format: (v: number) => string;
  zeroBased: boolean;
  threshold?: number | null;
  thresholdLabel?: string;
  ariaLabel: string;
}

/**
 * 한 차트에 시리즈 하나 (DESIGN.md "기기 상태"). 선 2px 밝은색, 축은 연하게.
 * 마우스를 올리거나 ←/→ 를 누르면 세로 가이드선 + 노란 점 + 밝은 툴팁.
 */
export function TimeSeriesChart({
  values,
  labels,
  kind,
  unit,
  format,
  zeroBased,
  threshold = null,
  thresholdLabel,
  ariaLabel,
}: TimeSeriesChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 640, height: MIN_HEIGHT });
  const { width, height } = size;
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const next = {
        width: Math.max(240, Math.round(entry.contentRect.width)),
        height: Math.max(MIN_HEIGHT, Math.round(entry.contentRect.height)),
      };
      setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const n = values.length;
  const plotW = width - M.left - M.right;
  const bottom = height - M.bottom;
  const scale = axisScale(values, { zeroBased, threshold });
  const y = linear([scale.min, scale.max], [bottom, M.top]);
  const cw = n > 0 ? plotW / n : plotW;
  const cx = (i: number) => M.left + (i + 0.5) * cw;

  const tickIdx = n > 1 ? [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (n - 1))) : [0];
  const barW = Math.min(14, cw * 0.6);

  const indexAt = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || n === 0) return null;
    const i = Math.floor((clientX - rect.left - M.left) / cw);
    return Math.min(n - 1, Math.max(0, i));
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const cur = hover ?? (e.key === 'ArrowRight' ? -1 : n);
    setHover(Math.min(n - 1, Math.max(0, cur + (e.key === 'ArrowRight' ? 1 : -1))));
  };

  const hv = hover != null ? values[hover] : undefined;
  const hx = hover != null ? cx(hover) : 0;

  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      tabIndex={0}
      role="img"
      aria-label={`${ariaLabel}. ←/→ 로 값 보기`}
      onPointerMove={(e: PointerEvent) => setHover(indexAt(e.clientX))}
      onPointerLeave={() => setHover(null)}
      onKeyDown={onKey}
      onBlur={() => setHover(null)}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        {scale.ticks.slice(1).map((t) => (
          <path key={t} d={`M${M.left} ${Math.round(y(t)) + 0.5}H${width - M.right}`} className={styles.grid} />
        ))}
        <path d={`M${M.left} ${bottom + 0.5}H${width - M.right}`} className={styles.baseline} />
        {scale.ticks.map((t) => (
          <text key={t} x={M.left - 8} y={y(t) + 4} textAnchor="end" className={styles.axis}>
            {format(t)}
          </text>
        ))}

        {threshold != null && (
          <>
            <path d={`M${M.left} ${y(threshold)}H${width - M.right}`} className={styles.threshold} />
            <text x={width - M.right - 2} y={y(threshold) - 6} textAnchor="end" className={styles.axis}>
              {thresholdLabel}
            </text>
          </>
        )}

        {kind === 'line' ? (
          <polyline
            points={values.map((v, i) => `${cx(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}
            className={styles.line}
          />
        ) : (
          values.map((v, i) =>
            v > 0 ? (
              <rect
                key={i}
                x={cx(i) - barW / 2}
                y={y(v)}
                width={barW}
                height={bottom - y(v)}
                rx={3}
                className={styles.bar}
                data-active={hover === i || undefined}
              />
            ) : null,
          )
        )}

        {tickIdx.map((i, k) => (
          <text key={k} x={cx(i)} y={height - 6} textAnchor="middle" className={styles.axis}>
            {labels[i]}
          </text>
        ))}

        {hover != null && hv !== undefined && (
          <>
            {/* 크로스헤어: 세로(시각) + 가로(값) 가이드선 */}
            <line x1={hx} x2={hx} y1={M.top} y2={bottom} className={styles.guide} />
            <line x1={M.left} x2={width - M.right} y1={y(hv)} y2={y(hv)} className={styles.guide} />
            {kind === 'line' && <circle cx={hx} cy={y(hv)} r={5} className={styles.dot} />}
            {/* 축 배지: y축에 값, x축에 시각 */}
            <AxisBadge x={M.left - 4} y={y(hv)} anchor="end" text={format(hv)} />
            <AxisBadge
              x={Math.max(M.left + 22, Math.min(width - M.right - 22, hx))}
              y={height - 10}
              anchor="middle"
              text={labels[hover] ?? ''}
            />
          </>
        )}
      </svg>
      {hover != null && hv !== undefined && (
        <div className={styles.tooltip} style={{ left: Math.max(0, Math.min(width - TIP_W, hx - TIP_W / 2)) }}>
          <span className="mono">{labels[hover]}</span>
          <strong>
            {format(hv)}
            {unit}
          </strong>
        </div>
      )}
    </div>
  );
}

/** 축 위에 겹쳐 그리는 밝은 값 배지 (크로스헤어가 가리키는 값·시각). */
function AxisBadge({ x, y, text, anchor }: { x: number; y: number; text: string; anchor: 'end' | 'middle' }) {
  const w = Math.max(28, text.length * 7 + 10);
  const left = anchor === 'end' ? x - w : x - w / 2;
  return (
    <g className={styles.badge}>
      <rect x={left} y={y - 9} width={w} height={18} rx={4} />
      <text x={left + w / 2} y={y + 4} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}
