# RU-Vibe (The Scarlet Drop)

Rutgers `@scarletmail.rutgers.edu` 전용 실시간 파티 히트맵 PWA.

## 멘토 규칙 (모든 세션에서 반드시 지킬 것)

이 프로젝트 작업자는 코딩 경험이 적은 CS 3학년, 인턴 취업 포트폴리오 겸 학습용으로 진행 중.

1. 코드 주기 전에 **왜 이렇게 짜는지** 먼저 설명 (트레이드오프, 왜 이 방식인지)
2. 한 번에 수백 줄 X — **작업 1개 = 태스크 체크리스트 1항목** 단위로 쪼개서 진행
3. 다음 항목으로 넘어가기 전에 **이해했는지 확인하는 질문** 던지기
4. 큰 기능은 코드 짜기 전에 구조/데이터 흐름을 먼저 제안하고 동의 구하기
5. 새 파일/폴더가 생기면 전체 파일 구조를 설명하고, 그중 지금 집중해서 봐야 할 부분이 어디인지 짚어주기

## 스택

| 영역 | 선택 | 이유 (한 줄) |
|---|---|---|
| Frontend | Next.js (App Router) + Bun | React 생태계, 빠른 패키지 매니저 |
| Backend | Supabase (Auth/Postgres/Realtime/Storage/Edge Functions) | 인증·실시간 동기화·배치 작업(6시 초기화)을 인프라 추가 없이 한 Postgres로 해결 |
| Map | Mapbox | 커스텀 마커/스타일링 |

## 서버 강제 규칙 (클라이언트는 표시만, 검증은 DB에서)

- **촬영 가능 시간**: 21:00~03:00 (America/New_York) — Postgres `now()` 기준 판정. 클라이언트가 보낸 시간은 신뢰 안 함 (폰 시간 조작 가능)
- **하루 3장 제한**: INSERT 시점에 RLS 정책/Postgres 함수로 카운트 체크

## 사진 메타데이터 (테크-폴라로이드)

시간 + GPS 위경도 + **랜덤 무드 이모지**(클라이언트 로컬 랜덤, 디바이스 API 불필요).
→ Battery Status API는 뺐음. iOS Safari 미지원(프라이버시 이슈로 deprecated)이라 무드 이모지로 대체.

## 디렉토리 구조 (초안)

```
ru-vibe/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (main)/map/page.tsx
│   ├── (main)/capture/page.tsx
│   └── layout.tsx
├── components/
│   ├── map/MapboxMap.tsx
│   └── capture/{CameraView,PolaroidCanvas}.tsx
├── lib/
│   ├── supabase/{client,server}.ts
│   ├── time-window.ts
│   └── device/geolocation.ts
├── supabase/
│   ├── migrations/
│   └── functions/daily-reset/
└── public/{manifest.json,icons/}
```

## 태스크 체크리스트

하나씩만 진행 → 완료 시 체크 → `/clear` 해도 이 파일이 다음 세션 컨텍스트 역할.

- [x] 1. Next.js + Bun 스캐폴딩, PWA manifest 기본 세팅
- [ ] 2. Supabase 프로젝트 연결 (`lib/supabase/client.ts`, `server.ts`, 환경변수)
- [ ] 3. Auth: scarletmail 도메인 제한 로그인/회원가입
- [ ] 4. DB 마이그레이션: `posts` 테이블 + RLS 정책 (시간 게이트, 3장/일 제한)
- [ ] 5. Capture 화면: `getUserMedia` 카메라 + Canvas 합성 (시간/GPS/무드 이모지)
- [ ] 6. Storage 업로드 + `posts` INSERT 연동
- [ ] 7. Map 화면: Mapbox 세팅 + 기존 마커 로드
- [ ] 8. Realtime 구독: 새 게시물 마커 실시간 추가
- [ ] 9. 매일 06:00 초기화: Supabase Edge Function (cron) + Storage 삭제
- [ ] 10. PWA 마무리: 아이콘, service worker, 설치 프롬프트
- [ ] 11. 배포 (Vercel + Supabase) + 최종 QA

## Open Questions

- Mapbox API 키 발급 여부
- Supabase 프로젝트 리전 (US East 추천 — 레이턴시)
