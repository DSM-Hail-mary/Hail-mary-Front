# HailMary 프론트 ↔ 서버 API 계약 (제안)

프론트는 `VITE_API_MODE=http`일 때 아래 REST 엔드포인트를 부릅니다. 현재 `Hail-mary-Server`에는
아직 없는 API라, 서버 구현 전까지는 `VITE_API_MODE=mock`(기본)으로 내장 예시 데이터를 씁니다.

- 응답 모양의 기준은 `src/domain/types.ts`, 검증은 `src/api/schemas.ts`(zod)입니다.
  계약과 다른 응답이 오면 화면이 조용히 깨지지 않고 어느 필드가 틀렸는지 에러로 나옵니다.
- 시각은 모두 ISO 8601 (시간대 포함, 예: `2026-09-27T09:15:22+09:00`). 화면 표시는 한국 시간 기준입니다.
- 날짜는 `YYYY-MM-DD`.
- 이미지 URL(`thumbnailUrl`, `crops[].url`)은 절대 URL 또는 API 기준 상대 경로 둘 다 됩니다.

| 메서드 | 경로 | 응답 | 용도 |
|---|---|---|---|
| GET | `/api/v1/drives/dates` | `DriveDate[]` (최신순) | 기준 날짜 선택 목록 |
| GET | `/api/v1/drives?date=YYYY-MM-DD` | `Drive[]` | 지도 주행 경로, 기기 상태 주행 선택 |
| GET | `/api/v1/records?date=YYYY-MM-DD` | `PoleRecord[]` | 지도 마커·목록·KPI |
| GET | `/api/v1/records/{id}` | `PoleRecord` | 상세 화면 (404 → "기록을 찾을 수 없습니다") |
| PATCH | `/api/v1/records/{id}` | `PoleRecord` | 처리 상태·판정 검수 변경. 본문 `{ "status"?: ..., "review"?: ... }` |
| GET | `/api/device/session/latest` | 서버 명세 형식 (아래) | 기기 상태 화면 — 가장 최근 주행 세션. 404면 "기록 없음" |
| GET | `/api/v1/sync` | `SyncStatus` | 상단 바 동기화 상태 (5초 간격, 진행 중이면 1초) |
| POST | `/api/v1/sync/retry` | `SyncStatus` | "다시 시도" |

## 서버 쪽에서 지켜 줘야 할 규칙

- **오탐(`review: "false_positive"`)** 으로 바뀌면 해당 크롭을 재학습용 폴더에 저장한다 (명세서 4.3).
  집계 제외는 프론트가 처리한다.
- **양호 기록**은 `status: null`. 양호 기록에 처리 상태를 주는 PATCH는 422로 거절한다.
- **동기화 중복 방지**: 같은 전주 기록이 다시 들어와도 기록 ID 기준으로 덮어쓴다 (명세서 6장).
- **GPS 미수신 기록**은 `position: null`, `poleId: null` ("ID 미할당"). ID 규칙은 명세서 10장 미정 사항.
- `basis`(등급 근거 단계 0/1/2)와 경계값은 판정 쪽에서 정해 내려준다 (명세서 10장 미정 사항).
- `previousVisit`은 같은 전주의 가장 최근 이전 방문. 없으면 `null` ("이전 기록 없음").

## 예시

```json
{
  "id": "2026-09-27_3501-12669-N",
  "poleId": "3501-12669-N",
  "driveId": "drive-20260927-1",
  "position": { "lat": 35.01462, "lng": 126.69183 },
  "headingDeg": 0,
  "recordedAt": "2026-09-27T09:15:22+09:00",
  "grade": "danger",
  "hazard": "nest",
  "status": "new",
  "review": null,
  "basis": { "metric": "nest_size", "level": 2 },
  "thumbnailUrl": "/media/2026-09-27/3501-12669-N/thumb.jpg",
  "crops": [
    {
      "id": "c1",
      "url": "/media/2026-09-27/3501-12669-N/crop1.jpg",
      "detections": [
        { "kind": "nest", "box": { "x": 0.285, "y": 0.147, "w": 0.215, "h": 0.187 }, "score": 0.91 },
        { "kind": "pole", "box": { "x": 0.445, "y": 0.013, "w": 0.11, "h": 0.973 }, "score": 0.97 }
      ]
    }
  ],
  "consecutiveFinds": 2,
  "previousVisit": {
    "date": "2026-09-13",
    "thumbnailUrl": "/media/2026-09-13/3501-12669-N/thumb.jpg",
    "basis": { "metric": "nest_size", "level": 1 }
  }
}
```

`detections[].box`는 크롭 이미지 크기 대비 0~1 비율 (x, y = 왼쪽 위).

## 기기 상태 (백엔드 명세 v0.2.0 §1 그대로)

`GET /api/device/session/latest` — 백엔드 "기기 상태 API 명세서"의 응답을 그대로 받습니다 (snake_case, 시각은 `HH:MM`).
프론트는 `src/api/deviceSession.ts`에서 형식을 검증하고 앱 형식으로 바꿉니다.

- 시각 `HH:MM`은 한국 시간(+09:00)으로 해석, 자정을 넘기면 다음 날로 이어 붙임
- `telemetry.t / temp / power / drops / gps` 배열 길이가 모두 같아야 함 (다르면 화면에 형식 오류 표시)
- `gps_reception`은 0~1, `gps`는 0/1
- 404 `{"detail": "세션 기록 없음"}` → "주행 기록이 없습니다"
- 응답 예시(테스트에 그대로 사용): `src/api/__fixtures__/deviceSessionLatest.json`

기기 상태만 먼저 서버에 붙이려면 `.env`에 `VITE_DEVICE_API_BASE=http://127.0.0.1:8000` 을 넣습니다.
