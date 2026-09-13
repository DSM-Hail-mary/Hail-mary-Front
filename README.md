# Hail-Mary Front

M11 통합 대시보드 (기능명세서 F-08). 실시간 점유율, 예측 vs 실제 전력 그래프(with/without occupancy),
이상 알림, 절감/탄소 지표를 한 화면에서 REST 폴링으로 보여준다. 빌드 스텝 없는 순수
HTML/CSS/JS — React 등 프레임워크 없이 `fetch()`만으로 동작한다.

`Hail-mary-Server`의 `Hail_Mary/dashboard/`에서 이 리포로 이전됨(2026-09-09). 백엔드 API는
그대로 `Hail-mary-Server`가 제공한다.

## 실행

**주의(2026-09-14)**: `Hail-mary-Server`는 이 리포 분리 이후 정적 마운트를 하지 않는다
(`main.py`: "M11 dashboard moved to the separate Hail-mary-Front repo -- this server only
serves the API now, no static mount here"). "같은 origin" 배포는 리버스 프록시(nginx 등)를
앞단에 두거나 Server 쪽에 정적 마운트를 다시 추가하는 경우에만 성립하고, 아무 설정도 안 했다면
아래처럼 **Front를 별도 origin으로 띄우는 것**이 실제로 동작하는 기본 경로다. Server의
`main.py`가 모든 origin을 허용하는 CORS를 이미 켜두었으므로(2026-09-14 추가) 이 경로가 실제
동작함을 확인했다.

```
python -m http.server 8080
```

- 기본 상태(`index.html`의 `<meta name="hail-mary-api-base" content="">` 비어있음)로는
  `app.js`가 상대경로로 `fetch()`하므로 **Front를 연 그 origin에 API가 없으면 전부
  "조회 실패"로 뜬다** — 이게 정상 동작이다(디자인만 확인할 때는 이대로 써도 됨).
- 실제 데이터까지 보려면 `content`를 Server 주소로 채운다: `content="http://<서버주소>:8000"`.
  같은 origin으로 정적 마운트해서 배포하는 경우(별도 설정 시)엔 계속 비워두면 됨 — 상대경로
  fetch가 그대로 맞는 API를 가리킴.

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
