# RU-Vibe (The Scarlet Drop)

Rutgers `@scarletmail.rutgers.edu` 전용 실시간 파티 히트맵 PWA.
`/map`에 유저들의 라이브 사진이 핀으로 찍히고, **핀이 몰린 곳 = 지금 핫플**.

앱에 표시되는 문구는 전부 영어 (사용자가 미국 대학생). 한국어는 대화/이 파일에서만.

## 멘토 규칙 (모든 세션에서 반드시 지킬 것)

작업자는 CS 3학년이지만 **웹 개발 실무 경험 거의 없음**. 서버/클라이언트, API, 컴포넌트, state 같은 **웹 기초 개념도 안다고 가정하지 말 것** (자료구조/알고리즘 지식과 별개로 취급). 인턴 포트폴리오 겸 학습용.

1. 코드보다 **왜 이렇게 짜는지**(트레이드오프) 먼저 설명
2. **작업 1개 = 체크리스트 1항목** 단위로 쪼개기. 한 번에 수백 줄 X
3. 다음 항목 전에 **이해 확인 질문** 던지기
4. 큰 기능은 코드 전에 구조/데이터 흐름 먼저 제안하고 동의 구하기
5. 새 파일이 생기면 어디를 집중해서 봐야 하는지 짚어주기
6. 새 개념은 **(1) 이게 없으면 뭐가 불편한지 → (2) 정의 2~3줄 → (3) 지금 왜 필요한지** 순서로. 용어 질문이 나오면 그 위 상위 개념도 모른다고 가정할 것
7. **체크리스트 1항목 완료 = 확인 없이 바로 `git commit` + `git push` + 이 파일 업데이트** (이미 승인된 동작). 푸시까지 해야 GitHub에 보임 — 포트폴리오용이므로 로컬 커밋만 쌓아두지 말 것

## 스택

Next.js (App Router) + Bun / Supabase (Auth·Postgres·Realtime·Storage·Edge Functions) / Mapbox.
Supabase를 고른 이유: 인증·실시간·6시 배치를 인프라 추가 없이 한 Postgres에서 해결.

## 결정 사항

**서버 강제 규칙** (클라이언트는 표시만, 검증은 DB에서)
- 촬영 시간 제한 없음, 24/7 (낮 캠퍼스 이벤트도 잡기 위해)
- 하루 3장 제한 — INSERT 시 RLS/Postgres 함수로 카운트 (America/New_York 06:00 리셋)

**인증 범위**
- `/map` 조회는 **비로그인 허용** (노출 > 배타성). 로그인은 `/capture`에만 필요
- `posts` RLS: SELECT 공개(anon 포함), INSERT만 인증 유저

**사진에 그리는 것: 날짜/시간뿐**
- GPS(`posts.lat/lng`) → 지도 핀 **위치**. 사진엔 안 그림 (핀과 중복이고, 공개 이미지에 좌표 새기면 프라이버시만 깎임)
- 무드 이모지(`posts.mood`) → 지도 핀 **아이콘**. 사진엔 안 그림

**카메라: 네이티브 카메라 앱** (`<input type="file" accept="image/*" capture="environment">`)
`getUserMedia` 커스텀 뷰파인더에서 갈아탐. 플래시/야간모드 등 화질이 훨씬 좋고 iOS 삽질이 사라짐. 대신 라이브 뷰파인더 위에 UI를 못 얹음 — 필요해지면 그때 재검토.

## 하드 러닝 (반복 삽질 금지)

**폰 실기기 테스트** — 카메라/GPS는 **secure context**(HTTPS 또는 localhost)에서만 동작. 폰에서 `http://<맥 IP>:3000`은 페이지만 보이고 기능은 죽음.
```bash
bun dev                                          # 터미널 1
cloudflared tunnel --url http://localhost:3000   # 터미널 2 → https://<랜덤>.trycloudflare.com
```
- `next.config.ts`의 `allowedDevOrigins: ["*.trycloudflare.com"]` **필수**. 없으면 Next dev가 터널 origin의 HMR 웹소켓을 거절 → 하이드레이션 실패 → **화면은 멀쩡한데 버튼이 전부 먹통**. 증상이 "카메라가 안 켜진다"로 보여서 원인 찾는 데 오래 걸렸음
- 터널 주소는 켤 때마다 바뀜. 로그인까지 테스트하려면 Supabase Redirect URLs에 매번 추가
- 확장 프로그램이 `<html>`에 속성 주입해서 나는 하이드레이션 경고(`__gcrremoteframetoken` 등)는 우리 버그 아님. 무시

**Canvas** — `MAX_EDGE=2048`로 긴 변 제한 필수. iOS Safari는 캔버스가 너무 크면 **에러 없이 빈 이미지**를 내놓고, 48MP 아이폰 사진이 여기 걸림. `createImageBitmap`엔 `imageOrientation:"from-image"` 필요 (없으면 세로 사진이 눕는다).

**이메일 발송** — 로컬 개발은 **Supabase 내장 메일러 그대로** (시간당 발송 제한 있으니 테스트 페이스 조절). 커스텀 SMTP는 배포 시점(실제 도메인 생긴 뒤)으로 미룸. Gmail(앱 비밀번호 535 실패)과 Resend(도메인 인증 전엔 가입 계정 주소로만 발송 가능 — GitHub 가입이라 scarletmail로 못 보냄) 둘 다 로컬에선 막혀서 시간만 소모함.

## 태스크 체크리스트

하나씩만 진행 → 완료 시 체크 → `/clear` 해도 이 파일이 다음 세션 컨텍스트 역할.

- [x] 1. Next.js + Bun 스캐폴딩, PWA manifest
- [x] 2. Supabase 연결 (`lib/supabase/{client,server}.ts`, 환경변수)
- [x] 3. Auth: scarletmail 도메인 제한 (매직 링크 — 비밀번호 없음, 세션 유지되므로 사실상 1회성)
- [x] 4. DB 마이그레이션: `posts` 테이블 + RLS (3장/일 제한)
- [ ] 5. Capture 화면
  - [x] 5-1. `PolaroidCanvas` — 네이티브 카메라 + 날짜/시간 오버레이 (아이폰 실기기 확인 완료)
  - [ ] 5-2. geolocation + 무드 이모지 랜덤 연결
- [ ] 6. Storage 업로드 + `posts` INSERT
- [ ] 7. Map 화면: Mapbox + 기존 마커 로드
- [ ] 8. Realtime 구독: 새 게시물 마커 실시간 추가
- [ ] 9. 매일 06:00 초기화: Edge Function (cron) + Storage 삭제
- [ ] 10. PWA 마무리: 아이콘, service worker, 설치 프롬프트
- [ ] 11. 배포 (Vercel + Supabase) + 최종 QA

## 나중에 / Open Questions

- **사진 aesthetic 고도화** — 태스크 8 이후. 룩 결정 코드는 `PolaroidCanvas`의 `drawImage` 이후 10줄에 전부 모여 있고 다른 곳은 사진 생김새에 의존하지 않음. 매일 06:00 삭제되니 "옛날 필터로 남은 사진" 문제도 없음. 후보: 폴라로이드 프레임(흰 여백+정사각형), 비네팅, 필름 그레인, `ctx.filter` 색보정, 커스텀 폰트
- `/capture` 보호용 middleware 아직 없음 (태스크 6에서)
- Mapbox API 키 발급 여부
- Supabase 리전 (US East 추천 — 레이턴시)
