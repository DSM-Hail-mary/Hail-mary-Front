import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { DETECTION_LABEL } from '@/domain/labels';
import type { Crop, Detection } from '@/domain/types';
import { Switch } from '@/ui/controls';
import { Icon } from '@/ui/Icon';
import styles from './CropViewer.module.css';

const ZOOMS = [1, 1.5, 2, 3] as const;
const SLOTS = 5;
/** 본 이미지 틀 비율 (856×642). */
const FRAME_ASPECT = 4 / 3;

interface Pan {
  x: number;
  y: number;
}

/** 확대 배율에서 이미지가 틀 밖으로 빠지지 않게 이동량을 제한한다 (틀 크기 대비 비율). */
function clampPan(pan: Pan, zoom: number): Pan {
  const max = (zoom - 1) / 2;
  const clamp = (v: number) => Math.min(max, Math.max(-max, v));
  return { x: clamp(pan.x), y: clamp(pan.y) };
}

/** 위험 요소 박스 중심. 확대할 때 여기부터 보여 준다. */
function focusOf(detections: readonly Detection[]): Pan {
  const hazard = detections.find((d) => d.kind !== 'pole');
  if (!hazard) return { x: 0, y: 0 };
  return { x: 0.5 - (hazard.box.x + hazard.box.w / 2), y: 0.5 - (hazard.box.y + hazard.box.h / 2) };
}

/**
 * 크롭 뷰어: 큰 이미지 + 검출 박스 + 확대/축소 + 썸네일 5칸.
 * - 썸네일 클릭 또는 ←/→ 로 크롭 전환
 * - 확대 상태에서 드래그로 이동, Ctrl+휠로 확대/축소
 */
export function CropViewer({ crops }: { crops: readonly Crop[] }) {
  const [index, setIndex] = useState(0);
  const [showBoxes, setShowBoxes] = useState(true);
  const [zoomIdx, setZoomIdx] = useState(0);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const drag = useRef<{ startX: number; startY: number; from: Pan; w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  /** 크롭 이미지 원본 비율 (가로/세로). 4:3이 아니면 틀 안에 여백을 두고 맞춰 박스 위치가 어긋나지 않게 한다. */
  const [aspect, setAspect] = useState(FRAME_ASPECT);

  const crop = crops[index];
  const zoom = ZOOMS[zoomIdx] ?? 1;

  const setZoom = (next: number) => {
    const idx = Math.min(ZOOMS.length - 1, Math.max(0, next));
    const z = ZOOMS[idx] ?? 1;
    setZoomIdx(idx);
    // 처음 확대할 때는 위험 요소 쪽으로, 이후엔 보던 지점이 가운데에 남도록 배율 비율만큼 옮긴다.
    setPan((p) => clampPan(zoomIdx === 0 && crop ? scalePan(focusOf(crop.detections), z) : scalePan(p, z / zoom), z));
  };

  const choose = (i: number) => {
    if (i !== index) setAspect(FRAME_ASPECT);
    setIndex(i);
    setPan((p) => (zoomIdx === 0 ? p : clampPan(scalePan(focusOf(crops[i]?.detections ?? []), zoom), zoom)));
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' && index < crops.length - 1) choose(index + 1);
    else if (e.key === 'ArrowLeft' && index > 0) choose(index - 1);
    else if (e.key === '+' || e.key === '=') setZoom(zoomIdx + 1);
    else if (e.key === '-') setZoom(zoomIdx - 1);
    else return;
    e.preventDefault();
  };

  // Ctrl/⌘+휠 확대. React의 wheel 핸들러는 passive라 기본 동작(페이지 확대)을 막으려면 직접 등록한다.
  const stageRef = useRef<HTMLDivElement>(null);
  const zoomBy = useRef<(delta: number) => void>(() => {});
  useEffect(() => {
    zoomBy.current = (delta) => setZoom(zoomIdx + delta);
  });
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomBy.current(e.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [crop]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (zoom === 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current = { startX: e.clientX, startY: e.clientY, from: pan, w: rect.width, h: rect.height };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setPan(clampPan({ x: d.from.x + (e.clientX - d.startX) / d.w, y: d.from.y + (e.clientY - d.startY) / d.h }, zoom));
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  return (
    <section aria-label="크롭 뷰어" className={styles.viewer}>
      <div className={styles.toolbar}>
        <span className={styles.counter}>
          크롭{' '}
          <span className="tabular">
            {crops.length ? index + 1 : 0} / {crops.length}
          </span>
        </span>
        <span className={styles.caption}>전주 상단 1024px 판정 이미지</span>
        <div className={styles.spacer} />
        <Switch label="검출 박스" checked={showBoxes} onChange={setShowBoxes} />
        <span className={styles.divider} aria-hidden="true" />
        <div role="group" aria-label="확대/축소" className={styles.zoom}>
          <button type="button" aria-label="축소" disabled={zoomIdx === 0} onClick={() => setZoom(zoomIdx - 1)}>
            <Icon name="minus" />
          </button>
          <span className={`mono ${styles.zoomLabel}`} aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="확대"
            disabled={zoomIdx === ZOOMS.length - 1}
            onClick={() => setZoom(zoomIdx + 1)}
          >
            <Icon name="plus" />
          </button>
        </div>
      </div>

      <div className={styles.stageWrap}>
        {crop ? (
          <div
            ref={stageRef}
            className={styles.stage}
            data-zoomed={zoom > 1 || undefined}
            data-dragging={dragging || undefined}
            tabIndex={0}
            role="img"
            aria-label={`판정 크롭 이미지 ${index + 1}. ←/→ 로 크롭 전환, +/- 로 확대`}
            onKeyDown={onKey}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={() => setZoom(zoomIdx === ZOOMS.length - 1 ? 0 : zoomIdx + 1)}
          >
            <div
              className={styles.canvas}
              style={{
                // contain: 원본 비율 그대로 틀 안에 넣는다
                width: aspect >= FRAME_ASPECT ? '100%' : `${(aspect / FRAME_ASPECT) * 100}%`,
                height: aspect >= FRAME_ASPECT ? `${(FRAME_ASPECT / aspect) * 100}%` : '100%',
                transform: `translate(${pan.x * 100}%, ${pan.y * 100}%) scale(${zoom})`,
                ['--zoom' as string]: zoom,
              }}
            >
              <img
                src={crop.url}
                alt=""
                draggable={false}
                className={styles.image}
                onLoad={(e) => {
                  const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                  if (w > 0 && h > 0) setAspect(w / h);
                }}
              />
              {showBoxes &&
                crop.detections.map((d, i) => (
                  <span
                    key={i}
                    className={`${styles.box} ${d.kind === 'pole' ? styles.boxPole : styles.boxHazard}`}
                    style={{
                      left: `${d.box.x * 100}%`,
                      top: `${d.box.y * 100}%`,
                      width: `${d.box.w * 100}%`,
                      height: `${d.box.h * 100}%`,
                    }}
                  >
                    <span className={styles.boxLabel}>
                      {DETECTION_LABEL[d.kind]}
                      <span className={styles.score}>{Math.round(d.score * 100)}%</span>
                    </span>
                  </span>
                ))}
            </div>
          </div>
        ) : (
          <div className={`${styles.stage} ${styles.noCrop}`}>크롭 이미지가 없습니다</div>
        )}
      </div>

      <div role="group" aria-label="크롭 선택" className={styles.thumbs}>
        {Array.from({ length: Math.max(SLOTS, crops.length) }, (_, i) => {
          const c = crops[i];
          if (!c) {
            return (
              <div key={`empty-${i}`} className={styles.emptySlot}>
                크롭 없음
              </div>
            );
          }
          return (
            <button
              key={c.id}
              type="button"
              aria-label={`크롭 ${i + 1} 보기`}
              aria-pressed={i === index}
              className={styles.thumb}
              onClick={() => choose(i)}
            >
              <span className={styles.thumbImage}>
                <img src={c.url} alt="" loading="lazy" />
              </span>
              <span className={styles.thumbLabel}>크롭 {i + 1}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function scalePan(p: Pan, zoom: number): Pan {
  // 확대 배율만큼 중심을 옮겨야 그 지점이 틀 가운데에 온다.
  return { x: p.x * zoom, y: p.y * zoom };
}
