# Hail-Mary Front

M11 통합 대시보드 (기능명세서 F-08). 실시간 점유율, 예측 vs 실제 전력 그래프(with/without occupancy),
이상 알림, 절감/탄소 지표를 한 화면에서 REST 폴링으로 보여준다. 빌드 스텝 없는 순수
HTML/CSS/JS — React 등 프레임워크 없이 `fetch()`만으로 동작한다.

`Hail-mary-Server`의 `Hail_Mary/dashboard/`에서 이 리포로 이전됨(2026-09-09). 백엔드 API는
그대로 `Hail-mary-Server`가 제공한다.

## 실행

FastAPI 앱(`Hail-mary-Server`)이 이 폴더를 정적 마운트하도록 설정한 뒤 그 서버로 열면
같은 origin이라 CORS 설정 없이 바로 동작한다. 로컬에서 디자인만 확인할 때는 아무 정적
서버로 이 폴더를 띄우면 된다(단, 이 경우 `/api/v1/...` 호출은 실서버가 없어 실패로
표시된다 — 정상 동작이다, "데이터 없음"/"조회 실패" 상태가 그대로 보이는지 확인하는
용도로 쓸 것):

```
python -m http.server 8080
```

## 테스트

`format.js`의 순수 함수(데이터 가공/포맷팅, DOM 없음)만 유닛 테스트 대상이다. 모킹 없이
실제 입력 shape으로 검증한다.

```
npm test
```

## 구조

- `index.html` — 마크업
- `styles.css` — 디자인 토큰(라이트/다크) + 컴포넌트 스타일
- `format.js` / `format.test.js` — 순수 데이터 가공 함수 + 테스트
- `app.js` — DOM 바인딩, SVG 차트 렌더링(호버 툴팁 포함), 폴링 루프
