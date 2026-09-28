import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useApi } from '@/api/ApiProvider';
import { queryKeys, useDeviceLog, useDriveDates, useRecords } from '@/api/queries';
import { useNavMemory } from '@/app/navMemory';
import { routes } from '@/app/routes';
import { dateOf, formatDateShort, formatDecimal, formatHourMinute, minutesBetween } from '@/domain/format';
import { gpsGaps, locationlessRecordsIn, summarizeDevice } from '@/domain/device';
import { sortRecords } from '@/domain/records';
import type { DeviceLog, Drive } from '@/domain/types';
import { ButtonLink } from '@/ui/Button';
import { Card, Inset } from '@/ui/Card';
import { TimeSeriesChart } from '@/ui/charts/TimeSeriesChart';
import { EmptyState, Loading } from '@/ui/EmptyState';
import { Picker } from '@/ui/Picker';
import styles from './DevicePage.module.css';

/** 주행 선택 목록에 보여 줄 최근 날짜 수. 날짜마다 요청이 하나씩 나간다. */
const RECENT_DATES = 10;

function useRecentDrives(): { drives: Drive[]; isPending: boolean } {
  const api = useApi();
  const { data: dates, isPending: datesPending } = useDriveDates();
  const recent = (dates ?? []).slice(0, RECENT_DATES);
  const results = useQueries({
    queries: recent.map((d) => ({ queryKey: queryKeys.drives(d.date), queryFn: () => api.listDrives(d.date) })),
  });
  const drives = results.flatMap((r) => r.data ?? []).sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  return { drives, isPending: datesPending || results.some((r) => r.isPending) };
}

function driveLabel(d: Drive) {
  return (
    <>
      {formatDateShort(d.date)}{' '}
      <span className="mono">
        {formatHourMinute(d.startedAt)}–{formatHourMinute(d.endedAt)}
      </span>
    </>
  );
}

/** 화면 C. 기기 상태 (벤치마크 확인용) */
export function DevicePage() {
  const [search, setSearch] = useSearchParams();
  const { mapDate } = useNavMemory();
  const { drives, isPending } = useRecentDrives();

  // 주행 선택: URL → 지도에서 보던 날짜의 주행 → 가장 최근 주행
  // 목록이 다 온 뒤에 기본값을 고른다 (도착 순서에 따라 엉뚱한 주행 로그를 요청하지 않도록).
  const requested = search.get('drive');
  const driveId = isPending
    ? (requested ?? undefined)
    : (requested ?? drives.find((d) => d.date === mapDate)?.id ?? drives[0]?.id);
  const drive = drives.find((d) => d.id === driveId);
  // 목록에서 확인된 주행만 로그를 받는다 (잘못된 ?drive= 로 404 요청을 보내지 않음).
  const log = useDeviceLog(drive?.id);
  const unknownDrive = !isPending && requested !== null && !drive;

  if (isPending) return <Loading />;
  if (drives.length === 0) {
    return (
      <EmptyState icon="pole" title="주행 기록이 없습니다">
        차량이 복귀해 동기화되면 기기 로그가 들어옵니다.
      </EmptyState>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.subheader}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>
            {log.data ? `${log.data.deviceName} · ${log.data.vehicleLabel}` : '기기 상태'}
          </h1>
          <span className={styles.subtitle}>주행 중 기록된 기기 로그 · 벤치마크 확인용</span>
        </div>
        <Picker
          label="주행 기록"
          align="right"
          value={driveId ?? ''}
          display={
            drive ? (
              <>
                {driveLabel(drive)}
                <span className={styles.muted}>{minutesBetween(drive.startedAt, drive.endedAt)}분</span>
              </>
            ) : (
              '선택'
            )
          }
          options={drives.map((d) => ({
            value: d.id,
            label: driveLabel(d),
            meta: `${minutesBetween(d.startedAt, d.endedAt)}분`,
          }))}
          onChange={(id) => setSearch({ drive: id }, { replace: true })}
        />
      </div>

      {unknownDrive ? (
        <EmptyState
          icon="filter"
          title="주행 기록을 찾을 수 없습니다"
          action={
            <ButtonLink to={routes.device()} variant="secondary">
              최근 주행 보기
            </ButtonLink>
          }
        >
          최근 {RECENT_DATES}일치 주행 목록에 없는 기록입니다. 위에서 주행을 다시 고르세요.
        </EmptyState>
      ) : log.isPending ? (
        <Loading />
      ) : log.isError ? (
        <EmptyState icon="error" title="기기 로그를 불러오지 못했습니다">
          {log.error.message}
        </EmptyState>
      ) : drive ? (
        <DeviceDashboard log={log.data} drive={drive} />
      ) : null}
    </div>
  );
}

function DeviceDashboard({ log, drive }: { log: DeviceLog; drive: Drive }) {
  const samples = log.samples;
  const summary = useMemo(() => summarizeDevice(samples), [samples]);
  const gaps = useMemo(() => gpsGaps(samples), [samples]);
  const { data: records = [] } = useRecords(drive.date);
  const labels = samples.map((s) => formatHourMinute(s.at));

  if (!summary) {
    return <EmptyState icon="pole" title="이 주행에는 기기 로그가 없습니다" />;
  }

  const minutes = minutesBetween(drive.startedAt, drive.endedAt);
  const tempOk = summary.maxTemp < log.tempWarnC;
  const tiles = [
    {
      label: '최고 온도',
      value: String(summary.maxTemp),
      unit: '°C',
      sub: `평균 ${formatDecimal(summary.avgTemp)}°C · 경고 기준 ${tempOk ? '미만' : '초과'}`,
      warn: !tempOk,
    },
    {
      label: '평균 전력',
      value: formatDecimal(summary.avgPower),
      unit: 'W',
      sub: `최대 ${formatDecimal(summary.maxPower)}W`,
    },
    { label: '프레임 드롭', value: String(summary.dropTotal), unit: '프레임', sub: `주행 ${minutes}분 합계` },
    {
      label: 'GPS 수신',
      value: String(summary.gpsRate),
      unit: '%',
      sub:
        summary.gpsMissMinutes > 0
          ? `${summary.gpsMissMinutes}분 미수신 · ${gaps.map((g) => labels[g.startIndex]).join(', ')}`
          : '전 구간 수신',
      warn: summary.gpsMissMinutes > 0,
    },
  ];

  return (
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

      <div className={styles.charts}>
        <Card
          title="온도"
          aside="°C"
          actions={
            <span className={styles.summary}>
              최고 {summary.maxTemp}°C · 평균 {formatDecimal(summary.avgTemp)}°C
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
            threshold={log.tempWarnC}
            thresholdLabel={`경고 기준 ${log.tempWarnC}°C`}
            ariaLabel={`온도 추이, ${labels[0]}부터 ${labels.at(-1)}까지`}
          />
        </Card>
        <Card
          title="전력"
          aside="W"
          actions={
            <span className={styles.summary}>
              평균 {formatDecimal(summary.avgPower)}W · 최대 {formatDecimal(summary.maxPower)}W
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
          aside="분당 프레임"
          actions={
            <span className={styles.summary}>
              {summary.dropPeak
                ? `최다 ${labels[summary.dropPeak.index]} · ${summary.dropPeak.value}프레임`
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
            ariaLabel={`분당 프레임 드롭, ${labels[0]}부터 ${labels.at(-1)}까지`}
          />
        </Card>

        <Card
          title="GPS 수신 상태"
          aside="분 단위"
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
                    to={routes.map({ date: dateOf(g.startAt), sel: first?.id })}
                  >
                    목록에서 보기
                  </ButtonLink>
                )}
              </Inset>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
