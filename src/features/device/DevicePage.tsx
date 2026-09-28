import { useMemo } from 'react';
import { useLatestDeviceSession, useRecords } from '@/api/queries';
import { routes } from '@/app/routes';
import { gpsGaps, locationlessRecordsIn, summarizeDevice } from '@/domain/device';
import { dateOf, formatDateShort, formatDecimal, formatHourMinute } from '@/domain/format';
import { sortRecords } from '@/domain/records';
import type { DeviceSession } from '@/domain/types';
import { Button, ButtonLink } from '@/ui/Button';
import { Card, Inset } from '@/ui/Card';
import { TimeSeriesChart } from '@/ui/charts/TimeSeriesChart';
import { EmptyState, Loading } from '@/ui/EmptyState';
import styles from './DevicePage.module.css';

/**
 * 화면 C. 기기 상태 (벤치마크 확인용).
 * 서버 GET /api/device/session/latest 의 가장 최근 주행 세션을 보여 준다 (백엔드 기기 상태 API 명세 §3).
 */
export function DevicePage() {
  const query = useLatestDeviceSession();

  if (query.isPending) return <Loading />;
  if (query.isError) {
    return (
      <EmptyState
        icon="error"
        title="기기 상태를 불러오지 못했습니다"
        action={<Button onClick={() => void query.refetch()}>다시 불러오기</Button>}
      >
        서버 연결을 확인하세요. {query.error.message}
      </EmptyState>
    );
  }
  if (!query.data) {
    return (
      <EmptyState icon="pole" title="주행 기록이 없습니다">
        차량 주행이 끝나고 기기 로그가 서버에 올라오면 여기에 표시됩니다.
      </EmptyState>
    );
  }
  return <DeviceDashboard session={query.data} />;
}

function DeviceDashboard({ session }: { session: DeviceSession }) {
  const { samples } = session;
  const derived = useMemo(() => summarizeDevice(samples), [samples]);
  const gaps = useMemo(() => gpsGaps(samples), [samples]);
  const { data: records = [] } = useRecords(session.date);
  const labels = samples.map((s) => formatHourMinute(s.at));
  const minutes = Math.round(session.durationSec / 60);
  const throttled = session.maxTemp >= session.throttleTemp;
  const gpsPercent = Math.round(session.gpsReception * 100);
  const dropRate = session.totalFrames > 0 ? (session.frameDrops / session.totalFrames) * 100 : null;

  const tiles = [
    {
      label: '최고 온도',
      value: formatDecimal(session.maxTemp),
      unit: '°C',
      sub: `평균 ${formatDecimal(session.avgTemp)}°C · 스로틀 기준(${formatDecimal(session.throttleTemp)}°C) ${throttled ? '초과' : '미만'}`,
      warn: throttled,
    },
    {
      label: '평균 전력',
      value: formatDecimal(session.avgPower),
      unit: 'W',
      sub: `최대 ${formatDecimal(session.maxPower)}W`,
    },
    {
      label: '프레임 드롭',
      value: session.frameDrops.toLocaleString('ko-KR'),
      unit: '프레임',
      sub:
        dropRate === null
          ? `주행 ${minutes}분 합계`
          : `전체 ${session.totalFrames.toLocaleString('ko-KR')}프레임 중 ${dropRate > 0 && dropRate < 0.01 ? '0.01% 미만' : `${dropRate.toFixed(2)}%`}`,
    },
    {
      label: 'GPS 수신',
      value: String(gpsPercent),
      unit: '%',
      sub: gaps.length
        ? `${gaps.reduce((n, g) => n + g.minutes, 0)}분 미수신 · ${gaps.map((g) => labels[g.startIndex]).join(', ')}`
        : '전 구간 수신',
      warn: gaps.length > 0,
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.subheader}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{session.device}</h1>
          <span className={styles.subtitle}>
            가장 최근 주행 · {formatDateShort(session.date)}{' '}
            <span className="mono">
              {formatHourMinute(session.startedAt)}~{formatHourMinute(session.endedAt)}
            </span>{' '}
            · {minutes}분
          </span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.tiles}>
          {tiles.map((t) => (
            <div key={t.label} className={styles.tile}>
              <span className={styles.tileLabel}>{t.label}</span>
              <span className={styles.tileValue}>
                <span className="tabular">{t.value}</span>
                <span className={styles.tileUnit}>{t.unit}</span>
              </span>
              <span className={`${styles.tileSub} ${t.warn ? styles.tileWarn : ''}`}>{t.sub}</span>
            </div>
          ))}
        </div>

        {samples.length === 0 ? (
          <EmptyState icon="pole" title="이 주행에는 시계열 기록이 없습니다" />
        ) : (
          <div className={styles.charts}>
            <Card
              title="온도"
              aside="°C"
              actions={
                <span className={styles.summary}>
                  최고 {formatDecimal(session.maxTemp)}°C · 평균 {formatDecimal(session.avgTemp)}°C
                </span>
              }
            >
              <TimeSeriesChart
                kind="line"
                values={samples.map((s) => s.tempC)}
                labels={labels}
                unit="°C"
                format={(v) => String(Math.round(v))}
                zeroBased={false}
                threshold={session.throttleTemp}
                thresholdLabel={`스로틀 기준 ${formatDecimal(session.throttleTemp)}°C`}
                ariaLabel={`온도 추이, ${labels[0]}부터 ${labels.at(-1)}까지`}
              />
            </Card>
            <Card
              title="전력"
              aside="W"
              actions={
                <span className={styles.summary}>
                  평균 {formatDecimal(session.avgPower)}W · 최대 {formatDecimal(session.maxPower)}W
                </span>
              }
            >
              <TimeSeriesChart
                kind="line"
                values={samples.map((s) => s.powerW)}
                labels={labels}
                unit="W"
                format={formatDecimal}
                zeroBased
                ariaLabel={`전력 추이, ${labels[0]}부터 ${labels.at(-1)}까지`}
              />
            </Card>
            <Card
              title="프레임 드롭"
              aside="구간별 프레임"
              actions={
                <span className={styles.summary}>
                  {derived?.dropPeak
                    ? `최다 ${labels[derived.dropPeak.index]} · ${derived.dropPeak.value}프레임`
                    : '드롭 없음'}
                </span>
              }
            >
              <TimeSeriesChart
                kind="bar"
                values={samples.map((s) => s.frameDrops)}
                labels={labels}
                unit="프레임"
                format={(v) => String(v)}
                zeroBased
                ariaLabel={`구간별 프레임 드롭, ${labels[0]}부터 ${labels.at(-1)}까지`}
              />
            </Card>

            <Card
              title="GPS 수신 상태"
              aside="구간별"
              actions={<span className={styles.summary}>미수신 구간의 기록은 지도에 표시되지 않음</span>}
            >
              <div className={styles.gps}>
                <div
                  role="img"
                  aria-label={`${labels[0]}부터 ${labels.at(-1)}까지 GPS 수신${gaps.length ? `, 미수신 ${gaps.map((g) => labels[g.startIndex]).join(', ')}` : ', 전 구간 수신'}`}
                  className={styles.strip}
                  style={{ gridTemplateColumns: `repeat(${samples.length}, minmax(0, 1fr))` }}
                >
                  {samples.map((s, i) => (
                    <span
                      key={i}
                      className={s.gpsFix ? styles.fix : styles.noFix}
                      title={`${labels[i]} ${s.gpsFix ? '수신' : '미수신'}`}
                    />
                  ))}
                </div>
                <div className={styles.stripAxis}>
                  {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                    <span key={f}>{labels[Math.round(f * (samples.length - 1))]}</span>
                  ))}
                </div>
              </div>
              <div className={styles.legend}>
                <span>
                  <span className={styles.fix} />
                  수신
                </span>
                <span>
                  <span className={styles.noFix} />
                  미수신
                </span>
              </div>
              {gaps.map((g) => {
                const count = locationlessRecordsIn(records, g);
                // 그 구간의 첫 "위치 없음" 기록을 목록에서 바로 선택해 보여 준다.
                const first = sortRecords(records, 'time').find(
                  (r) =>
                    !r.position &&
                    Date.parse(r.recordedAt) >= Date.parse(g.startAt) &&
                    Date.parse(r.recordedAt) < Date.parse(g.endAt),
                );
                return (
                  <Inset key={g.startIndex} className={styles.gapNote}>
                    <span className="mono">
                      {labels[g.startIndex]}
                      {g.minutes > 1 ? `–${labels[g.endIndex]}` : ''}
                    </span>
                    <span>
                      미수신 {g.minutes}분 · 이 구간 기록 {count}건이 &quot;위치 없음&quot;으로 들어옴
                    </span>
                    {first && (
                      <ButtonLink
                        variant="ghost"
                        className={styles.gapLink}
                        to={routes.map({ date: dateOf(g.startAt), sel: first.id })}
                      >
                        목록에서 보기
                      </ButtonLink>
                    )}
                  </Inset>
                );
              })}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
