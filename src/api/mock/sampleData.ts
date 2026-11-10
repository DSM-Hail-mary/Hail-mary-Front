import { BASIS_LEVEL_GRADE } from '@/domain/labels';
import type {
  BasisLevel,
  Crop,
  Drive,
  GradeBasis,
  HazardType,
  LatLng,
  PoleRecord,
  ProcessStatus,
  ReviewResult,
} from '@/domain/types';
import { serverDeviceSessionSchema, toDeviceSession } from '../deviceSession';
import latestSessionFixture from '../__fixtures__/deviceSessionLatest.json';
import { CROP_VIEWS, mockCrop, mockThumbnail } from './images';
import type { MockDataset } from './mockApi';

/**
 * ⚠ 테스트 전용 예시 데이터 — 실제 전주가 아니다.
 * 앱을 그냥 실행하면 불러오지 않는다. VITE_MOCK_SAMPLE_DATA=true 일 때만(자동 테스트) 쓴다.
 *
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

// 실제 배전선로 기준: 한 도로(나주 용머리길)를 따라 평균 경간(span) ~38m로 연속 배치(총 연장 ~420m).
// 좌표는 OSM 실도로 지오메트리에서 곡선이 가장 뚜렷한 구간을 뽑아 40m 간격으로 샘플링했다
// (직각 격자가 아니라 실제 길처럼 S자로 휘어짐).
const SITES: Site[] = [
  {
    poleId: '3500-12668-E',
    pos: { lat: 35.01599, lng: 126.69649 },
    hazard: 'nest',
    visits: { [D13]: '-', [D20]: '-', [D27]: '-' },
  },
  { poleId: '3500-12669-E', pos: { lat: 35.01592, lng: 126.69688 }, hazard: 'nest', visits: { [D20]: '-', [D27]: 1 } },
  { poleId: '3501-12669-N', pos: { lat: 35.01565, lng: 126.69716 }, hazard: 'nest', visits: { [D13]: 1, [D27]: 2 } },
  {
    poleId: '3502-12669-N',
    pos: { lat: 35.01561, lng: 126.69753 },
    hazard: 'nest',
    visits: { [D13]: '-', [D20]: '-', [D27]: '-' },
  },
  {
    poleId: '3502-12670-E',
    pos: { lat: 35.01595, lng: 126.69762 },
    hazard: 'tree',
    visits: { [D13]: 1, [D20]: 1, [D27]: 1 },
  },
  {
    poleId: '3502-12671-E',
    pos: { lat: 35.01624, lng: 126.69788 },
    hazard: 'nest',
    visits: { [D13]: '-', [D27]: '-' },
  },
  {
    poleId: '3502-12672-E',
    pos: { lat: 35.01652, lng: 126.69815 },
    hazard: 'nest',
    visits: { [D13]: 2, [D20]: 2, [D27]: 2 },
  },
  {
    poleId: '3503-12673-N',
    pos: { lat: 35.01677, lng: 126.69846 },
    hazard: 'nest',
    visits: { [D13]: '-', [D20]: '-', [D27]: '-' },
  },
  { poleId: '3503-12674-E', pos: { lat: 35.01703, lng: 126.69875 }, hazard: 'nest', visits: { [D20]: '-', [D27]: 1 } },
  {
    poleId: '3503-12676-S',
    pos: { lat: 35.01733, lng: 126.69899 },
    hazard: 'nest',
    visits: { [D20]: '-', [D27]: '-' },
  },
  { poleId: '3502-12676-S', pos: { lat: 35.01765, lng: 126.69916 }, hazard: 'tree', visits: { [D20]: 1, [D27]: 2 } },
  { poleId: '3502-12677-E', pos: { lat: 35.01794, lng: 126.69915 }, hazard: 'nest', visits: { [D20]: '-', [D27]: '-' } },
  // GPS 미수신 구간에 찍힌 기록(좌표 없음)
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
    end: '10:03:07',
    times: ['10:02:00', '10:02:07', '10:02:15', '10:02:21', '10:02:30', '10:02:37', '10:02:48', '10:02:54'],
    statuses: { '3501-12669-N': 'checked', '3502-12670-E': 'checked', '3502-12672-E': 'checked' },
    reviews: { '3501-12669-N': 'correct', '3502-12672-E': 'correct' },
    cropCounts: {},
  },
  {
    date: D20,
    id: 'drive-20260920-1',
    start: '09:05:00',
    end: '09:06:25',
    times: [
      '09:05:00',
      '09:05:09',
      '09:05:16',
      '09:05:27',
      '09:05:33',
      '09:05:41',
      '09:05:48',
      '09:05:58',
      '09:06:04',
      '09:06:13',
    ],
    statuses: { '3502-12670-E': 'new', '3502-12672-E': 'planned', '3502-12676-S': 'checked' },
    reviews: { '3502-12670-E': 'false_positive', '3502-12672-E': 'correct' },
    cropCounts: { '3502-12672-E': 5 },
  },
  {
    date: D27,
    id: 'drive-20260927-1',
    start: '09:11:00',
    end: '09:12:46',
    times: [
      '09:11:00',
      '09:11:07',
      '09:11:15',
      '09:11:21',
      '09:11:30',
      '09:11:37',
      '09:11:48',
      '09:11:54',
      '09:12:02',
      '09:12:09',
      '09:12:19',
      '09:12:25',
      '09:12:34',
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

// 주행 경로: 전주들이 늘어선 실도로(용머리길)를 10m 간격으로 따라간다. OSM 실제 도로 지오메트리라
// 직각 꺾임이 아니라 S자로 매끄럽게 휜다. 시작·끝은 첫/마지막 전주보다 조금 앞뒤로 둬 진입·이탈을 표현.
const ROUTE: LatLng[] = [
  { lat: 35.01599, lng: 126.69621 },
  { lat: 35.01599, lng: 126.69632 },
  { lat: 35.01599, lng: 126.69643 },
  { lat: 35.016, lng: 126.69654 },
  { lat: 35.01601, lng: 126.69665 },
  { lat: 35.016, lng: 126.69675 },
  { lat: 35.01595, lng: 126.69684 },
  { lat: 35.01589, lng: 126.69692 },
  { lat: 35.01583, lng: 126.697 },
  { lat: 35.01576, lng: 126.69707 },
  { lat: 35.01569, lng: 126.69713 },
  { lat: 35.01562, lng: 126.6972 },
  { lat: 35.01557, lng: 126.6973 },
  { lat: 35.01555, lng: 126.69739 },
  { lat: 35.01558, lng: 126.6975 },
  { lat: 35.01564, lng: 126.69757 },
  { lat: 35.01573, lng: 126.69758 },
  { lat: 35.01582, lng: 126.69759 },
  { lat: 35.01591, lng: 126.6976 },
  { lat: 35.016, lng: 126.69764 },
  { lat: 35.01608, lng: 126.69769 },
  { lat: 35.01614, lng: 126.69776 },
  { lat: 35.01621, lng: 126.69784 },
  { lat: 35.01627, lng: 126.69792 },
  { lat: 35.01634, lng: 126.69799 },
  { lat: 35.01641, lng: 126.69805 },
  { lat: 35.01648, lng: 126.69812 },
  { lat: 35.01656, lng: 126.69818 },
  { lat: 35.01663, lng: 126.69824 },
  { lat: 35.01669, lng: 126.69833 },
  { lat: 35.01674, lng: 126.69841 },
  { lat: 35.01679, lng: 126.6985 },
  { lat: 35.01684, lng: 126.69859 },
  { lat: 35.01692, lng: 126.69866 },
  { lat: 35.01699, lng: 126.69872 },
  { lat: 35.01707, lng: 126.69878 },
  { lat: 35.01714, lng: 126.69884 },
  { lat: 35.01721, lng: 126.6989 },
  { lat: 35.01729, lng: 126.69896 },
  { lat: 35.01737, lng: 126.69901 },
  { lat: 35.01745, lng: 126.69904 },
  { lat: 35.01754, lng: 126.69907 },
  { lat: 35.01762, lng: 126.69913 },
  { lat: 35.01769, lng: 126.6992 },
  { lat: 35.01776, lng: 126.69927 },
  { lat: 35.01784, lng: 126.69925 },
  { lat: 35.01791, lng: 126.69918 },
  { lat: 35.01798, lng: 126.69911 },
  { lat: 35.01804, lng: 126.69903 },
  { lat: 35.0181, lng: 126.69895 },
];

function buildDrives(): Drive[] {
  return DRIVES.map((d) => ({
    id: d.id,
    date: d.date,
    startedAt: iso(d.date, d.start),
    endedAt: iso(d.date, d.end),
    route: ROUTE,
  }));
}

export function createSampleDataset(): MockDataset {
  const drives = buildDrives();
  return {
    records: buildRecords(),
    drives,
    // 기기 상태: 서버 명세 응답 예시를 같은 변환기로 읽는다 (실제 서버와 같은 경로)
    deviceSession: toDeviceSession(serverDeviceSessionSchema.parse(latestSessionFixture)),
    lastSyncedAt: iso(D27, '18:42:00'),
  };
}
