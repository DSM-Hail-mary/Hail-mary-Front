# PoleWatch Front

복귀 후 사무실에서 보는 **전주 위험(까치집·수목) 지도 대시보드**입니다. 차량의 Jetson이 오프라인으로
기록한 판정 결과를 Wi-Fi 동기화 후 지도·목록으로 보고, 상세 화면에서 판정을 검수하고 처리 상태를 관리합니다.

- 기능 명세: [`docs/기능명세서.md`](docs/기능명세서.md)
- 디자인 핸드오프: [`docs/design/DESIGN.md`](docs/design/DESIGN.md), 토큰 `docs/design/tokens.css`, 아트보드 `docs/design/artboards/`
- 서버 API 계약(제안): [`docs/API.md`](docs/API.md)

> 2026-09-28: 이전 M11 에너지 대시보드(순수 HTML/JS)를 PoleWatch로 교체했습니다. 이전 코드는 git 히스토리(`15ea6d6`)에 있습니다.

## 화면

| 경로 | 화면 |
|---|---|
| `#/map?date=&grade=&hazard=&status=&sort=&sel=` | A. 지도·목록 — KPI, 지도(경로·미점검 도로·마커·요약 카드), 목록(필터·정렬·CSV·페이지) |
| `#/poles/:recordId` | B. 전주 상세·검수 — 크롭 뷰어(검출 박스·확대/이동), 기록 정보, 판정 검수, 처리 상태, 이력 비교 |
| `#/device?drive=` | C. 기기 상태 — 온도·전력·프레임 드롭 차트, GPS 수신 띠 |

지도 화면 상태는 URL에 들어 있어 새로고침·공유·뒤로 가기에도 그대로 남습니다.

키보드: 목록 ↑/↓ 이동 · Esc 선택 해제 · 상세 `[` `]` 이전/다음 위험 전주 · 크롭 ←/→ 전환, +/− 확대 · 차트 ←/→ 값 보기

## 실행

Node 20 이상.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ (정적 파일, 어느 정적 서버에 올려도 동작 — 해시 라우터)
npm run check      # 타입 검사 + ESLint + 테스트
```

설정은 `.env.example`을 `.env`로 복사해서 바꿉니다.

| 변수 | 기본 | 설명 |
|---|---|---|
| `VITE_API_MODE` | `mock` | `mock`: 내장 예시 데이터 / `http`: 서버 API |
| `VITE_API_BASE` | (빈 값) | `http` 모드 서버 주소. 비우면 같은 origin |
| `VITE_MAP_TILE_URL` | OSM 표준 타일 | Leaflet 타일 URL 템플릿. **API 키 없이 동작** |
| `VITE_MAP_TILE_DARKEN` | 타일 URL 미지정 시 `true` | 밝은 타일을 CSS 필터로 무채색 다크로 |
| `VITE_MAP_TILE_CACHE` | `true` | 타일을 서비스 워커로 7일 캐시 (`public/tile-sw.js`) |
| `VITE_MOCK_SYNC` | `done` | mock 동기화 초기 상태 `done`/`syncing`/`failed` (상태 화면 확인용) |

mock 모드 예시 데이터는 2026-09-13, 09-20, 09-27 세 번의 주행입니다. 기준 날짜는 기본 "오늘"이라
처음엔 빈 상태가 나오고, "최근 기록 날짜로 이동"을 누르면 09-27 주행이 열립니다.

### 지도 타일

기본은 OpenStreetMap 공개 타일(키 불필요)입니다. OSM 공개 타일 서버는
[이용 정책](https://operations.osmfoundation.org/policies/tiles/)상 대량 트래픽용이 아니므로,
실사용이 늘면 자체 타일 서버나 상용 타일로 `VITE_MAP_TILE_URL`을 바꾸세요.
처음부터 어두운 타일을 쓰면 `VITE_MAP_TILE_DARKEN=false`.

공개 타일 서버에 요청 제한이 걸리지 않도록 다음을 해 두었습니다.

- 지도를 움직이는 동안이 아니라 멈췄을 때만 타일을 받고, 주행을 바꿀 때 줌 애니메이션을 쓰지 않습니다(중간 줌 타일 요청 없음).
- 화면 밖 선행 로딩(`keepBuffer`)은 기본 2에서 3으로만 늘렸습니다 (`src/config.ts`).
- 서비스 워커가 받은 타일을 7일간(최대 3000장) 캐시합니다. 같은 지역은 다시 요청하지 않고,
  서버가 거절하거나 네트워크가 끊겨도 본 적 있는 타일은 보여 줍니다.
- 타일 실패가 몰리면 지도 왼쪽 위에 안내가 뜹니다. 경로와 마커는 타일과 별개라 계속 보입니다.

## 구조

```
src/
  domain/      순수 로직 (타입, 라벨, 필터·집계·정렬, CSV, 기기 로그 요약, 시각 포맷) + 테스트
  api/         PoleWatchApi 인터페이스, HTTP 구현(zod 검증), mock 구현, TanStack Query 훅
  ui/          공용 컴포넌트 (등급 글리프, 필, 버튼, 셀렉트/세그먼트/스위치, 카드, 빈 상태, 피커, 차트)
  features/    화면별 컴포넌트 (map / detail / device)
  app/         라우터, 상단 바, 동기화 표시, 탭 이동 기억
  styles/      tokens.css(디자인 핸드오프 원본) + tokens.app.css(아트보드 추가 값) + base.css
```

- 화면 문구는 `src/domain/labels.ts`, 색·치수는 CSS 변수(`--pw-*`)에서만 바꿉니다.
- 서버 데이터는 TanStack Query로 캐시하고, 처리 상태·검수 변경은 낙관적으로 바로 반영한 뒤 실패하면 되돌립니다.
- 동기화가 "진행 중 → 완료"로 바뀌면 데이터를 모두 다시 받습니다.
- 스타일은 CSS Modules. 색은 새 hue를 추가하지 않습니다 (DESIGN.md "색").

## 미정 사항 (명세서 10장)

- 등급 판정 기준: 등급 근거 단계 라벨·대응은 `labels.ts`의 `BASIS_LEVEL_*`, 우선순위 가중치는 `records.ts`의 `priorityScore`
- GPS 미수신 기록의 전주 ID 규칙 (현재 "ID 미할당")
- 이력 비교 포함 여부, 수목 클래스 확보 여부
