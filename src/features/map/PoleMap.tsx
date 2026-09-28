import L from 'leaflet';
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import { config } from '@/config';
import { formatHourMinute } from '@/domain/format';
import { GRADE_LABEL, hazardLabel, poleIdLabel } from '@/domain/labels';
import { isFalsePositive } from '@/domain/records';
import type { Drive, LatLng, PoleRecord } from '@/domain/types';
import { GradeGlyph, gradeGlyphHtml } from '@/ui/GradeGlyph';
import { Icon } from '@/ui/Icon';
import './leaflet-overrides.css';
import styles from './PoleMap.module.css';

const toLatLng = (p: LatLng): L.LatLngTuple => [p.lat, p.lng];

/** 떠 있는 카드·범례에 가려지지 않게 두는 여백. */
const FIT_PADDING = { paddingTopLeft: L.point(60, 60), paddingBottomRight: L.point(400, 90) };
const PAN_PADDING = { paddingTopLeft: L.point(60, 60), paddingBottomRight: L.point(420, 90) };

/** 등급·오탐 조합별 아이콘은 한 번만 만든다. 선택·강조는 클래스만 바꾼다. */
const iconCache = new Map<string, L.DivIcon>();

function markerIcon(record: PoleRecord): L.DivIcon {
  const fp = isFalsePositive(record);
  const key = `${record.grade}:${fp}`;
  let icon = iconCache.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: [styles.marker, fp ? styles.markerFp : ''].filter(Boolean).join(' '),
      html: `<span class="${styles.markerInner}">${gradeGlyphHtml(record.grade)}</span>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

interface MarkerProps {
  record: PoleRecord;
  position: LatLng;
  selected: boolean;
  hovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

const RecordMarker = memo(function RecordMarker({
  record,
  position,
  selected,
  hovered,
  onSelect,
  onHover,
}: MarkerProps) {
  const markerRef = useRef<L.Marker>(null);
  const icon = markerIcon(record);
  const label = `${poleIdLabel(record.poleId)} ${GRADE_LABEL[record.grade]}${isFalsePositive(record) ? ' (오탐)' : ''}`;
  const handlers = useMemo<L.LeafletEventHandlerFnMap>(
    () => ({
      click: () => onSelect(record.id),
      mouseover: () => onHover(record.id),
      mouseout: () => onHover(null),
    }),
    [onSelect, onHover, record.id],
  );

  // 선택·강조 상태와 접근성 속성은 요소에 직접 반영한다 (아이콘을 다시 만들지 않음).
  useEffect(() => {
    const el = markerRef.current?.getElement();
    if (!el) return;
    el.classList.toggle(styles.markerSelected!, selected);
    el.classList.toggle(styles.markerHovered!, hovered && !selected);
    el.setAttribute('aria-label', label);
    el.setAttribute('aria-pressed', String(selected));
  }, [icon, label, selected, hovered]);

  return (
    <Marker
      ref={markerRef}
      position={toLatLng(position)}
      icon={icon}
      keyboard
      zIndexOffset={selected ? 1000 : hovered ? 900 : record.grade === 'danger' ? 100 : 0}
      eventHandlers={handlers}
    >
      {!selected && (
        <Tooltip direction="top" offset={[0, -18]} className={styles.markerTip}>
          <span className="mono">{poleIdLabel(record.poleId)}</span> · {GRADE_LABEL[record.grade]}
          {record.hazard ? ` · ${hazardLabel(record.hazard)}` : ''}
        </Tooltip>
      )}
    </Marker>
  );
});

export interface PoleMapProps {
  drives: readonly Drive[];
  /** 지도에 그릴 기록 (필터 적용 후). 좌표 없는 기록은 여기서 걸러진다. */
  records: readonly PoleRecord[];
  selectedId: string | null;
  /** 목록 행에 마우스를 올린 기록. 지도 마커도 같이 강조한다. */
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  /** 지도 위에 띄울 요소 (요약 카드, 빈 상태 안내 등). */
  children?: ReactNode;
}

export function PoleMap({ drives, records, selectedId, hoveredId, onSelect, onHover, children }: PoleMapProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const located = useMemo(
    () => records.filter((r): r is PoleRecord & { position: LatLng } => r.position !== null),
    [records],
  );

  // 컨테이너 크기가 바뀌면(창 크기, 첫 레이아웃) Leaflet에 다시 알려 준다.
  useEffect(() => {
    if (!map) return;
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  // 주행이 바뀌면 경로 전체가 보이게 맞춘다. 애니메이션 없이 바로 옮겨 중간 줌 타일 요청을 만들지 않는다.
  const boundsKey = drives.map((d) => d.id).join(',');
  useEffect(() => {
    if (!map) return;
    map.invalidateSize();
    const points = drives.flatMap((d) => d.route.map(toLatLng));
    if (points.length > 0) map.fitBounds(L.latLngBounds(points), { ...FIT_PADDING, animate: false });
    // 경로 좌표는 주행 ID가 같으면 같다고 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, boundsKey]);

  // 목록에서 고른 기록이 화면 밖이면 보이는 곳까지 부드럽게 옮긴다 (같은 줌이라 타일 요청이 적다).
  const selectedPos = located.find((r) => r.id === selectedId)?.position;
  useEffect(() => {
    if (map && selectedPos) map.panInside(toLatLng(selectedPos), { ...PAN_PADDING, animate: true, duration: 0.35 });
  }, [map, selectedPos]);

  return (
    <section aria-label="지도" className={styles.root}>
      <MapContainer
        ref={setMap}
        className={styles.map}
        center={config.map.defaultCenter}
        zoom={config.map.defaultZoom}
        zoomControl={false}
        attributionControl
        keyboard
        zoomSnap={0.5}
        wheelPxPerZoomLevel={90}
      >
        <TileLayer
          url={config.map.tileUrl}
          attribution={config.map.attribution}
          className={config.map.darkenTiles ? styles.darkTiles : undefined}
          // 움직이는 동안이 아니라 멈췄을 때만 타일을 받는다 → 요청 수가 줄어든다.
          updateWhenZooming={false}
          updateWhenIdle
        />
        {drives.map((d) => (
          <DriveLayer key={d.id} drive={d} />
        ))}
        {located.map((r) => (
          <RecordMarker
            key={r.id}
            record={r}
            position={r.position}
            selected={r.id === selectedId}
            hovered={r.id === hoveredId}
            onSelect={onSelect}
            onHover={onHover}
          />
        ))}
      </MapContainer>

      {children}

      <Legend />

      <div className={`${styles.floating} ${styles.zoom}`}>
        <button type="button" aria-label="확대" onClick={() => map?.zoomIn()}>
          <Icon name="plus" />
        </button>
        <span className={styles.zoomDivider} aria-hidden="true" />
        <button type="button" aria-label="축소" onClick={() => map?.zoomOut()}>
          <Icon name="minus" />
        </button>
      </div>
    </section>
  );
}

function DriveLayer({ drive }: { drive: Drive }) {
  const route = drive.route.map(toLatLng);
  const start = route[0];
  const end = route.at(-1);
  return (
    <>
      {drive.unscannedRoads.map((road, i) => (
        <Polyline
          key={i}
          positions={road.map(toLatLng)}
          pathOptions={{ className: styles.unscanned, weight: 3, dashArray: '7 6', interactive: false }}
        />
      ))}
      <Polyline
        positions={route}
        pathOptions={{
          className: styles.routeCasing,
          weight: 11,
          lineJoin: 'round',
          lineCap: 'round',
          interactive: false,
        }}
      />
      <Polyline
        positions={route}
        pathOptions={{ className: styles.route, weight: 6, lineJoin: 'round', lineCap: 'round', interactive: false }}
      />
      {start && (
        <CircleMarker
          center={start}
          radius={7}
          pathOptions={{ className: styles.startPin, weight: 3, fillOpacity: 1, interactive: false }}
        >
          <Tooltip permanent direction="bottom" offset={[0, 10]} className={styles.pinLabel}>
            출발 {formatHourMinute(drive.startedAt)}
          </Tooltip>
        </CircleMarker>
      )}
      {end && (
        <CircleMarker
          center={end}
          radius={7}
          pathOptions={{ className: styles.endPin, weight: 3, fillOpacity: 1, interactive: false }}
        >
          <Tooltip permanent direction="bottom" offset={[0, 10]} className={styles.pinLabel}>
            종료 {formatHourMinute(drive.endedAt)}
          </Tooltip>
        </CircleMarker>
      )}
    </>
  );
}

function Legend() {
  return (
    <div role="group" aria-label="범례" className={`${styles.floating} ${styles.legend}`}>
      <div className={styles.legendRow}>
        <span className={styles.legendItem}>
          <svg width="28" height="8" viewBox="0 0 28 8" aria-hidden="true">
            <path d="M2 4h24" stroke="var(--pw-map-route-casing)" strokeWidth="8" strokeLinecap="round" />
            <path d="M2 4h24" stroke="var(--pw-map-route)" strokeWidth="4" strokeLinecap="round" />
          </svg>
          주행 경로
        </span>
        <span className={styles.legendItem}>
          <svg width="28" height="8" viewBox="0 0 28 8" aria-hidden="true">
            <path d="M1 4h26" stroke="var(--pw-map-unscanned)" strokeWidth="3" strokeDasharray="6 4" />
          </svg>
          미점검 도로
        </span>
      </div>
      <div className={styles.legendRow}>
        {(['danger', 'warn', 'ok'] as const).map((g) => (
          <span key={g} className={styles.legendItem}>
            <GradeGlyph grade={g} size="sm" />
            {GRADE_LABEL[g]}
          </span>
        ))}
      </div>
    </div>
  );
}
