import { BASIS_LEVEL_GRADE } from '@/domain/labels';
import type {
  BasisLevel,
  Crop,
  DeviceLog,
  DeviceSample,
  Drive,
  GradeBasis,
  HazardType,
  LatLng,
  PoleRecord,
  ProcessStatus,
  ReviewResult,
} from '@/domain/types';
import { CROP_VIEWS, mockCrop, mockThumbnail } from './images';

/**
 * 목 모드 예시 데이터. 2026-09-27 주행은 디자인 아트보드의 샘플 값을 그대로 옮겼고,
 * 이력 비교용으로 09-13, 09-20 주행을 덧붙였다. 전주 ID·좌표·수치는 모두 예시다.
 */

const TZ = '+09:00';
const iso = (date: string, time: string) => `${date}T${time}${TZ}`;

const HEADING: Record<string, number> = { N: 0, E: 90, S: 180, W: 270 };

/** 방문 결과: 등급 근거 단계, 또는 '-'(양호), 또는 없음(그날 지나가지 않음). */
type Visit = BasisLevel | '-';

interface Site {
  poleId: string | null;
  pos: LatLng | null;
  hazard: HazardType;
  visits: Partial<Record<string, Visit>>;
}

const D13 = '2026-09-13';
const D20 = '2026-09-20';
const D27 = '2026-09-27';

const SITES: Site[] = [
  {
    poleId: '3500-12668-E',
    pos: { lat: 35.00412, lng: 126.68871 },
    hazard: 'nest',
    visits: { [D13]: '-', [D20]: '-', [D27]: '-' },
  },
  { poleId: '3500-12669-E', pos: { lat: 35.00418, lng: 126.69022 }, hazard: 'nest', visits: { [D20]: '-', [D27]: 1 } },
  { poleId: '3501-12669-N', pos: { lat: 35.01462, lng: 126.69183 }, hazard: 'nest', visits: { [D13]: 1, [D27]: 2 } },
  {
    poleId: '3502-12669-N',
    pos: { lat: 35.02105, lng: 126.6919 },
    hazard: 'nest',
    visits: { [D13]: '-', [D20]: '-', [D27]: '-' },
  },
  {
    poleId: '3502-12670-E',
    pos: { lat: 35.02611, lng: 126.70254 },
    hazard: 'tree',
    visits: { [D13]: 1, [D20]: 1, [D27]: 1 },
  },
  {
    poleId: '3502-12671-E',
    pos: { lat: 35.02608, lng: 126.71377 },
    hazard: 'nest',
    visits: { [D13]: '-', [D27]: '-' },
  },
  {
    poleId: '3502-12672-E',
    pos: { lat: 35.02615, lng: 126.7249 },
    hazard: 'nest',
    visits: { [D13]: 2, [D20]: 2, [D27]: 2 },
  },
  {
    poleId: '3503-12673-N',
    pos: { lat: 35.03172, lng: 126.73012 },
    hazard: 'nest',
    visits: { [D13]: '-', [D20]: '-', [D27]: '-' },
  },
  { poleId: '3503-12674-E', pos: { lat: 35.0359, lng: 126.74126 }, hazard: 'nest', visits: { [D20]: '-', [D27]: 1 } },
  {
    poleId: '3503-12676-S',
    pos: { lat: 35.03418, lng: 126.76005 },
    hazard: 'nest',
    visits: { [D20]: '-', [D27]: '-' },
  },
  { poleId: '3502-12676-S', pos: { lat: 35.02977, lng: 126.76011 }, hazard: 'tree', visits: { [D20]: 1, [D27]: 2 } },
  { poleId: '3502-12677-E', pos: { lat: 35.02604, lng: 126.7714 }, hazard: 'nest', visits: { [D20]: '-', [D27]: '-' } },
  // GPS 미수신 구간(09:31)에 찍힌 기록
  { poleId: null, pos: null, hazard: 'nest', visits: { [D27]: 1 } },
];

interface DriveSpec {
  date: string;
  id: string;
  start: string;
  end: string;
  /** 사이트 순서대로의 기록 시각. 방문하지 않은 사이트는 건너뛴다. */
  times: string[];
  statuses: Partial<Record<string, ProcessStatus>>;
  reviews: Partial<Record<string, ReviewResult>>;
  /** 크롭 개수 (3~5). 기본 4. */
  cropCounts: Partial<Record<string, number>>;
}

const DRIVES: DriveSpec[] = [
  {
    date: D13,
    id: 'drive-20260913-1',
    start: '10:02:00',
    end: '10:19:00',
    times: ['10:03:10', '10:05:02', '10:06:40', '10:09:12', '10:11:30', '10:13:05', '10:15:48', '10:17:20'],
    statuses: { '3501-12669-N': 'checked', '3502-12670-E': 'checked', '3502-12672-E': 'checked' },
    reviews: { '3501-12669-N': 'correct', '3502-12672-E': 'correct' },
    cropCounts: {},
  },
  {
    date: D20,
    id: 'drive-20260920-1',
    start: '09:05:00',
    end: '09:24:00',
    times: [
      '09:06:02',
      '09:07:41',
      '09:09:15',
      '09:11:04',
      '09:13:22',
      '09:15:01',
      '09:16:40',
      '09:18:12',
      '09:20:35',
      '09:22:50',
    ],
    statuses: { '3502-12670-E': 'new', '3502-12672-E': 'planned', '3502-12676-S': 'checked' },
    reviews: { '3502-12670-E': 'false_positive', '3502-12672-E': 'correct' },
    cropCounts: { '3502-12672-E': 5 },
  },
  {
    date: D27,
    id: 'drive-20260927-1',
    start: '09:11:00',
    end: '09:32:00',
    // 디자인 샘플 (Main.dc.html) 그대로
    times: [
      '09:12:04',
      '09:13:40',
      '09:15:22',
      '09:16:05',
      '09:18:31',
      '09:19:10',
      '09:20:48',
      '09:22:15',
      '09:24:02',
      '09:25:36',
      '09:27:19',
      '09:29:40',
      '09:31:02',
    ],
    statuses: {
      '3500-12669-E': 'new',
      '3501-12669-N': 'new',
      '3502-12670-E': 'checked',
      '3502-12672-E': 'planned',
      '3503-12674-E': 'new',
      '3502-12676-S': 'checked',
      noloc: 'new',
    },
    reviews: {},
    cropCounts: { '3500-12669-E': 3, '3502-12672-E': 5, '3503-12674-E': 3, noloc: 3 },
  },
];

const siteKey = (s: Site) => s.poleId ?? 'noloc';

function basisOf(site: Site, visit: Visit): GradeBasis | null {
  if (visit === '-') return null;
  return { metric: site.hazard === 'nest' ? 'nest_size' : 'tree_proximity', level: visit };
}

function buildRecords(): PoleRecord[] {
  const records: PoleRecord[] = [];
  for (const spec of DRIVES) {
    const visited = SITES.filter((s) => s.visits[spec.date] !== undefined);
    visited.forEach((site, i) => {
      const visit = site.visits[spec.date]!;
      const key = siteKey(site);
      const basis = basisOf(site, visit);
      const grade = basis ? BASIS_LEVEL_GRADE[basis.level] : 'ok';
      const hazard = grade === 'ok' ? null : site.hazard;
      const scene = { hazard, level: basis?.level ?? null };
      const cropCount = spec.cropCounts[key] ?? 4;
      const id = `${spec.date}_${key}`;
      const crops: Crop[] = CROP_VIEWS.slice(0, cropCount).map((view, n) => ({
        id: `${id}_crop${n + 1}`,
        ...mockCrop(scene, view),
      }));

      // 같은 전주의 가장 최근 이전 방문
      const prevDate = DRIVES.map((d) => d.date)
        .filter((d) => d < spec.date && site.visits[d] !== undefined)
        .at(-1);
      const prevVisit = prevDate ? site.visits[prevDate]! : undefined;

      // 이번 포함 연속으로 위험 요소가 발견된 방문 수
      let consecutive = 0;
      if (hazard) {
        for (const d of DRIVES.map((x) => x.date)
          .filter((d) => d <= spec.date)
          .reverse()) {
          const v = site.visits[d];
          if (v === undefined) continue;
          if (v === '-' || BASIS_LEVEL_GRADE[v] === 'ok') break;
          consecutive += 1;
        }
      }

      records.push({
        id,
        poleId: site.poleId,
        driveId: spec.id,
        position: site.pos,
        headingDeg: site.poleId ? (HEADING[site.poleId.slice(-1)] ?? null) : null,
        recordedAt: iso(spec.date, spec.times[i] ?? spec.end),
        grade,
        hazard,
        status: hazard ? (spec.statuses[key] ?? 'new') : null,
        review: spec.reviews[key] ?? null,
        basis,
        thumbnailUrl: mockThumbnail(scene),
        crops,
        consecutiveFinds: consecutive,
        previousVisit:
          prevDate && prevVisit !== undefined
            ? {
                date: prevDate,
                thumbnailUrl: mockThumbnail({
                  hazard: prevVisit === '-' ? null : site.hazard,
                  level: prevVisit === '-' ? null : prevVisit,
                }),
                basis: basisOf(site, prevVisit),
              }
            : null,
      });
    });
  }
  return records;
}

// 경로: 서→북→동→북→동→남→동 (디자인 지도와 같은 모양)
const ROUTE: LatLng[] = [
  { lat: 35.0041, lng: 126.685 },
  { lat: 35.00415, lng: 126.6918 },
  { lat: 35.0261, lng: 126.6919 },
  { lat: 35.0261, lng: 126.73 },
  { lat: 35.0359, lng: 126.73 },
  { lat: 35.0359, lng: 126.76 },
  { lat: 35.0261, lng: 126.76 },
  { lat: 35.0261, lng: 126.779 },
];

const UNSCANNED: LatLng[][] = [
  [
    { lat: 35.0151, lng: 126.68 },
    { lat: 35.0151, lng: 126.6918 },
  ],
  [
    { lat: 35.0151, lng: 126.692 },
    { lat: 35.0165, lng: 126.73 },
    { lat: 35.0172, lng: 126.78 },
  ],
  [
    { lat: 35.0041, lng: 126.692 },
    { lat: 35.0041, lng: 126.78 },
  ],
  [
    { lat: 35.0261, lng: 126.73 },
    { lat: 35.0041, lng: 126.73 },
  ],
  [
    { lat: 35.0359, lng: 126.6919 },
    { lat: 35.0261, lng: 126.6919 },
  ],
  [
    { lat: 35.0261, lng: 126.76 },
    { lat: 35.0041, lng: 126.76 },
  ],
  [
    { lat: 35.0359, lng: 126.76 },
    { lat: 35.042, lng: 126.76 },
  ],
];

function buildDrives(): Drive[] {
  return DRIVES.map((d) => ({
    id: d.id,
    date: d.date,
    startedAt: iso(d.date, d.start),
    endedAt: iso(d.date, d.end),
    route: ROUTE,
    unscannedRoads: UNSCANNED,
  }));
}

/** 09-27 주행 기기 로그 (Device.dc.html 샘플). 다른 날은 여기서 조금씩 흔든다. */
const BASE_TEMP = [48, 52, 55, 58, 60, 62, 63, 65, 66, 67, 68, 69, 70, 70, 71, 72, 72, 73, 73, 74, 74, 73];
const BASE_POWER = [
  5.8, 7.2, 7.9, 8.1, 8.4, 8.3, 8.6, 8.8, 8.5, 8.7, 8.9, 9.1, 8.8, 8.9, 9.0, 9.2, 9.1, 8.9, 9.0, 9.3, 9.1, 6.2,
];
const BASE_DROPS = [0, 1, 0, 2, 0, 0, 3, 1, 0, 0, 4, 2, 0, 1, 0, 0, 6, 2, 0, 1, 0, 0];

/** 결정적 의사난수 (같은 시드 → 같은 값). */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function buildDeviceLogs(drives: Drive[]): DeviceLog[] {
  return drives.map((drive, di) => {
    const minutes = Math.round((Date.parse(drive.endedAt) - Date.parse(drive.startedAt)) / 60_000) + 1;
    const isBase = drive.date === D27;
    const rand = seeded(di + 7);
    const samples: DeviceSample[] = Array.from({ length: minutes }, (_, i) => {
      const bi = Math.min(i, BASE_TEMP.length - 1);
      const jitter = isBase ? 0 : rand() * 4 - 2;
      return {
        at: new Date(Date.parse(drive.startedAt) + i * 60_000).toISOString(),
        tempC: Math.round(BASE_TEMP[bi]! + jitter),
        powerW: Math.round((BASE_POWER[bi]! + jitter / 5) * 10) / 10,
        frameDrops: isBase ? BASE_DROPS[bi]! : Math.max(0, Math.round(BASE_DROPS[bi]! + jitter)),
        gpsFix: isBase ? i !== 20 : true,
      };
    });
    return {
      driveId: drive.id,
      deviceName: 'Jetson Orin Nano',
      vehicleLabel: '차량 1',
      tempWarnC: 80,
      samples,
    };
  });
}

export interface MockDataset {
  records: PoleRecord[];
  drives: Drive[];
  deviceLogs: DeviceLog[];
  lastSyncedAt: string;
}

export function createMockDataset(): MockDataset {
  const drives = buildDrives();
  return {
    records: buildRecords(),
    drives,
    deviceLogs: buildDeviceLogs(drives),
    lastSyncedAt: iso(D27, '18:42:00'),
  };
}
