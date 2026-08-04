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
7. **안 보이는 계층은 말로 설명하지 말고 보게 할 것** (2026-07-30 추가). RLS·`proxy.ts`·버킷 정책처럼 화면에 안 나타나는 것들은 설명만 하면 "그렇다더라"로 남는다. 순서: **(1) 작업자가 직접 돌리는 명령 1개 → (2) 결과를 보고 → (3) 설명**. 필요하면 정책을 잠깐 지워 깨뜨리고 증상을 보여줄 것
8. **퀴즈는 "만약 ~했다면" 금지, "지금 ~하면 무슨 결과가 나오나"로.** 실물을 안 본 상태의 반사실 질문은 순서가 거꾸로다. 문제에 코드를 언급하면 **그 코드를 문제 안에 붙일 것**
9. **결정 사항을 코드 전에 몰아서 설명하지 말 것.** 아무것도 안 만든 상태에서 트레이드오프 3개 비교는 이해가 안 된다. 필요한 순간에 1개씩
10. **작업자가 "실습" 또는 "퀴즈"라고 하면 아래 형식으로.** 태스크 6 이후 가장 효과가 좋았던 방식:
    - 명령 4~5개짜리 **랩(lab)** 을 낸다. 각 명령은 안 보이는 계층 하나를 드러내야 함 (`proxy.ts`의 307, RLS의 42501, `using(true)`로 뚫린 SELECT, 키 없이 200 나는 public 버킷)
    - **매 명령마다 실행 전에 결과를 예상하게 시킨다.** 예상이 빗나간 지점이 곧 모르는 지점
    - 명령은 짧게. 긴 URL 붙여넣기는 터미널에서 잘리므로 변수(`$(...)`)나 `/tmp/*.sh` 스크립트로 우회
    - 퀴즈 답을 다 맞히길 기대하지 말고, **틀린 답의 패턴**을 분석해 다음 설명 방식을 바꾼다
11. **체크리스트 1항목 완료 = 확인 없이 바로 `git commit` + `git push` + 이 파일 업데이트** (이미 승인된 동작). 푸시까지 해야 GitHub에 보임 — 포트폴리오용이므로 로컬 커밋만 쌓아두지 말 것

12. **태스크 9부터: 원인을 먼저 말해주지 말 것** (2026-08-03 추가). 지금까지는 증상이 나오면 멘토가 원인을 짚어줬다(`SUBSCRIBED`인데 조용한 이유, 버튼 먹통의 범인). 작업자는 **넓게 여러 프로덕트를 만드는 전략**을 택했고, 그 전략에서 유일한 안전망은 "증상 → 어느 계층인지 좁히기"다. 순서: **(1) 증상만 보여준다 → (2) "브라우저 / Next 서버 / Supabase 중 어디일 것 같나" 먼저 묻는다 → (3) 좁히는 명령을 작업자가 고르게 한다 → (4) 그다음 설명.** 틀려도 좁히는 과정 자체가 목적이므로 바로 정답을 주지 말 것

### 작업자 학습 상태 (2026-08-02)

- **강한 곳**: 파일에 글자로 적혀 있는 규칙 — SQL 정책문, 헤더 값, 파일 흐름
- **약한 곳**: 코드에 안 보이는 개입 계층 — `proxy.ts`, RLS, 버킷 정책이 "언제 누가 부르는지". 본인 표현: *"파일 흐름은 알겠는데 개입하는 그런 것들이 잘 이해가 안 돼"*
- **반사실 질문("만약 private 버킷이었다면")은 실물을 본 뒤에만** 작동함
- 태스크 6 랩 완료: `proxy.ts` 307 / RLS 42501 / `using(true)` SELECT 통과 / public 버킷 200 을 직접 `curl`로 확인함
- 태스크 8 랩 완료: publication 없이 `.subscribe()`가 `SUBSCRIBED`를 돌려주는 것을 직접 봄. "구독 등록(Realtime 서버)"과 "데이터 공급(Postgres)"이 별개 계층이라는 것이 여기서 잡힘

#### 공유 어휘 (2026-08-03 전체 구조 브리핑에서 합의 — 이후 설명은 이걸 재사용할 것)

- **장소 3개**: ① 브라우저(유저 폰) / ② Next 서버(우리 코드) / ③ Supabase. 핵심은 **①이 ②를 건너뛰고 ③과 직접 통신**한다는 것 — 그래서 방어가 ②가 아니라 ③ 안에 있어야 한다
- **개입 계층 4개**: `proxy.ts`(②, UX용·우회 가능) / `posts` RLS(③) / Storage 정책(③) / `supabase_realtime` publication(③). 공통점은 **우리 코드가 부르지 않고 중간에서 자동으로 검사된다**는 것
- 작업자의 진로 판단(2026-08-03): **깊이보다 넓이** — 프로덕트 개수를 늘리는 전략. 깊게 파는 것(웹소켓 내부, 논리복제, React 스케줄러)은 투자 대비 회수가 낮다고 판단해 보류. 대신 위 12번 규칙으로 디버깅 자립을 보완

## 스택

Next.js (App Router) + Bun / Supabase (Auth·Postgres·Realtime·Storage·Edge Functions) / Mapbox.
Supabase를 고른 이유: 인증·실시간·6시 배치를 인프라 추가 없이 한 Postgres에서 해결.

## 결정 사항

**서버 강제 규칙** (클라이언트는 표시만, 검증은 DB에서)
- 촬영 시간 제한 없음, 24/7 (낮 캠퍼스 이벤트도 잡기 위해)
- 하루 3장 제한 — INSERT 시 RLS/Postgres 함수로 카운트 (America/New_York 06:00 리셋)

**로그인: 매직 링크 → 6자리 OTP 코드** (2026-07-30 변경)
매직 링크는 메일 앱이 링크를 여는 브라우저에 세션을 꽂는데, Gmail 앱은 구글 인앱 브라우저로 연다. 세션 쿠키는 브라우저별로 따로라 유저가 나중에 Safari로 열면 로그아웃 상태 — 안내문으로 못 덮는 구조적 문제. 코드는 유저가 눈으로 읽어 원래 화면에 입력하므로 브라우저를 건너가지 않는다.
곁다리로 `app/auth/callback/route.ts` 삭제, Supabase Redirect URLs 설정 자체가 불필요해짐(터널 주소를 매번 등록하던 삽질도 사라짐).
**대시보드 → Authentication → Email Templates → Magic Link 에 `{{ .Token }}` 이 들어 있어야 함.**

**인증 범위**
- `/map` 조회는 **비로그인 허용** (노출 > 배타성). 로그인은 `/capture`에만 필요
- `posts` RLS: SELECT 공개(anon 포함), INSERT만 인증 유저

**사진에 그리는 것: 날짜/시간뿐**
- GPS(`posts.lat/lng`) → 지도 핀 **위치**. 사진엔 안 그림 (핀과 중복이고, 공개 이미지에 좌표 새기면 프라이버시만 깎임)
- ~~무드 이모지(`posts.mood`) → 지도 핀 **아이콘**~~ → **철회 (2026-08-02).** 무드마다 아이콘이 달라지면 지저분해서 **핀 전부 📍 하나로 통일**.
  - 커스텀 element를 넘길 땐 **`anchor: "bottom"` 필수**. 기본값은 요소의 한가운데를 좌표에 맞추는데 📍는 아래 끝이 가리키는 그림이라, 안 주면 핀이 실제 위치보다 아래를 가리킨다
  - `mood` 컬럼과 `/capture`의 랜덤 선택은 그대로 두되 **아무 데도 안 쓰임** — 태스크 10까지 용처가 안 생기면 컬럼째 삭제할 것

**Storage: `photos` 버킷, 읽기 public / 쓰기 `<uid>/` 폴더만**
- 업로드는 브라우저 → Supabase **직접**. 우리 Next 서버 경유는 전송량 2배인데, 권한 검사를 Storage RLS가 이미 하므로 서버가 할 일이 없음
- 버킷 public인 이유: `/map`이 비로그인 공개라 `<img src>`가 그냥 열려야 함. private이면 사진마다 signed URL 발급(핀 50개 = 호출 50번, 1시간 뒤 만료)
- `posts.photo_url`엔 **전체 public URL** 저장. 보통은 경로만 저장하는 게 정석(스토리지 이전 시 URL이 썩어서)이지만, 매일 06:00에 전부 지워지므로 썩을 과거 데이터가 없음

**Mapbox 토큰: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (public `pk.` 토큰, 시크릿 스코프 0개)**
`NEXT_PUBLIC_`은 "공개해도 된다"는 허가가 아니라 **빌드 시 값을 브라우저 JS에 글자 그대로 박아 넣으라는 명령**이다. 그래서 시크릿 스코프(`uploads:write` 등)를 하나라도 켜면 그 권한이 전 세계에 뿌려진다. 지도 타일 렌더링은 스코프 없이도 되는 기본 권한이라 아무것도 체크할 필요 없음.
anon key와 같은 구조 — 키는 이름표고 진짜 방어선은 서버(Supabase는 RLS, Mapbox는 스코프+URL 제한+사용량 한도).
**URL 제한은 태스크 11에서** Vercel 도메인 확정 후 추가. 지금 걸면 `cloudflared` 랜덤 도메인이라 개발 중 지도가 죽는다.
**좌표 순서: Mapbox는 `[lng, lat]`, `posts` 테이블은 `lat`/`lng`.** 뒤집어도 에러가 안 나고 지도 반대편에 핀이 찍힌다.

**카메라: 네이티브 카메라 앱** (`<input type="file" accept="image/*" capture="environment">`)
`getUserMedia` 커스텀 뷰파인더에서 갈아탐. 플래시/야간모드 등 화질이 훨씬 좋고 iOS 삽질이 사라짐. 대신 라이브 뷰파인더 위에 UI를 못 얹음 — 필요해지면 그때 재검토.

## 하드 러닝 (반복 삽질 금지)

**폰 실기기 테스트** — 카메라/GPS는 **secure context**(HTTPS 또는 localhost)에서만 동작. 폰에서 `http://<맥 IP>:3000`은 페이지만 보이고 기능은 죽음.
```bash
bun dev                                          # 터미널 1
cloudflared tunnel --url http://localhost:3000   # 터미널 2 → https://<랜덤>.trycloudflare.com
```
- `next.config.ts`의 `allowedDevOrigins: ["*.trycloudflare.com"]` **필수**. 없으면 Next dev가 터널 origin의 HMR 웹소켓을 거절 → 하이드레이션 실패 → **화면은 멀쩡한데 버튼이 전부 먹통**. 증상이 "카메라가 안 켜진다"로 보여서 원인 찾는 데 오래 걸렸음
- 확장 프로그램이 `<html>`에 속성 주입해서 나는 하이드레이션 경고(`__gcrremoteframetoken` 등)는 우리 버그 아님. 무시

**서버 리다이렉트 목적지는 헤더에서 조립** — route handler·`proxy.ts`에서 `new URL(request.url)`로 절대 주소를 만들면 터널 뒤에서 `https://localhost:3000/login` 잡종이 나온다. 범인은 터널이 아니라 Next다(cloudflared는 `host`/`x-forwarded-host`를 제대로 넘김 — 측정 완료). Next가 `request.url`을 Host 헤더가 아니라 **자기 listen 주소**로 조립하면서 proto만 `x-forwarded-proto`에서 가져오기 때문. 증상이 "로그인이 안 된다"로 보이는데 실제로는 로그인은 성공했고 마지막 이동만 깨진 것이라 원인이 안 보인다.
```ts
const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
const proto = request.headers.get("x-forwarded-proto") ?? "http";
return NextResponse.redirect(new URL("/login", `${proto}://${host}`));
```
`Location`에 상대 경로만 넣는 방법은 route handler에선 되지만 **`proxy.ts`에선 `ERR_INVALID_URL`로 거부**된다.

**Next 16은 `middleware.ts` → `proxy.ts`** (export 이름도 `proxy`). 옛 이름도 동작하지만 deprecated 경고가 뜬다.

**인앱 브라우저(Gmail/구글/인스타 앱 안의 브라우저)에서 geolocation이 죽는다** — 팝업도 안 뜨고 성공/실패 콜백 둘 다 안 불려서 `locating…`에 무한 정지. `timeout`은 권한 허용 *이후*부터 세기 때문에 타이머조차 시작 안 함. 위치 권한이 사이트가 아니라 그 앱 자체의 권한을 따라감. iOS 설정에서 위치 서비스가 전부 ON이어도 막힘. 카메라는 되는데 GPS만 죽어서 원인이 안 보임. → Safari로 열어야 함. 세션 쿠키는 브라우저별로 따로라 옮기면 재로그인 필요.

**Canvas** — `MAX_EDGE=2048`로 긴 변 제한 필수. iOS Safari는 캔버스가 너무 크면 **에러 없이 빈 이미지**를 내놓고, 48MP 아이폰 사진이 여기 걸림. `createImageBitmap`엔 `imageOrientation:"from-image"` 필요 (없으면 세로 사진이 눕는다).

**이메일 발송: Brevo SMTP** (2026-07-30) — OTP 코드를 보내려면 메일 템플릿에 `{{ .Token }}`을 넣어야 하는데, **Supabase는 커스텀 SMTP 없이는 템플릿 편집을 잠근다**. 그래서 배포까지 미룰 수 없었음. Brevo를 고른 이유: 도메인 없이 발신자 주소만 인증하면 아무 수신자에게나 발송 가능(무료 300통/일). 이전 실패들 — Gmail(앱 비밀번호 535), Resend(도메인 인증 전엔 가입 계정 주소로만 발송 가능).
- 커스텀 SMTP를 켜면 발송 제한이 시간당 2 → 30으로 자동 상향
- **Brevo IP 검사**: Supabase 발송 서버 IP가 바뀌면 차단되고, 증상은 "코드가 안 온다"로만 보임(앱엔 에러 없음). Brevo 메일로 authorize 요청이 옴
- **스팸함으로 감** — 도메인 인증(SPF/DKIM)이 없어서 정상. 진짜 해결은 태스크 11에서 도메인 사고 Brevo에 DNS 레코드 등록. 그전까진 스팸함 확인
- **OTP 코드 길이는 대시보드 설정값**(Authentication → Sign In/Providers → Email, 기본 6, 최대 10). 클라이언트 `maxLength`에 박아두면 안 됨 — 짧게 잘려서 "코드가 계속 틀리다"로만 보임

## 태스크 체크리스트

하나씩만 진행 → 완료 시 체크 → `/clear` 해도 이 파일이 다음 세션 컨텍스트 역할.

- [x] 1. Next.js + Bun 스캐폴딩, PWA manifest
- [x] 2. Supabase 연결 (`lib/supabase/{client,server}.ts`, 환경변수)
- [x] 3. Auth: scarletmail 도메인 제한 (**6자리 OTP 코드** — 비밀번호 없음, 세션 유지되므로 사실상 1회성)
- [x] 4. DB 마이그레이션: `posts` 테이블 + RLS (3장/일 제한)
- [x] 5. Capture 화면
  - [x] 5-1. `PolaroidCanvas` — 네이티브 카메라 + 날짜/시간 오버레이 (아이폰 실기기 확인 완료)
  - [x] 5-2. geolocation + 무드 이모지 랜덤 — 촬영 직후 요청, 좌표·무드는 `capture/page.tsx`가 state로 보관 (태스크 6 업로드가 여기서 꺼내 씀)
- [x] 6. Storage 업로드 + `posts` INSERT
  - [x] 6-1. `photos` 버킷 + 업로드 정책 (읽기 public / 쓰기는 `<uid>/` 폴더만)
  - [x] 6-2. Post 버튼: `canvas.toBlob` → 업로드 → INSERT (맥 웹캠으로 `Posted!`까지 확인)
  - [x] 6-3. `/capture` 로그인 보호 `proxy.ts` (Next 16은 `middleware.ts` 아님)
  - 폰 실기기에서 OTP 로그인 → 촬영 → Post → Storage·`posts` 양쪽 확인 완료
- [x] 7. Map 화면: Mapbox + 기존 마커 로드
  - [x] 7-1. `mapbox-gl` 설치 + 빈 지도 (`app/(main)/map/page.tsx`, 캠퍼스 전체가 보이는 중심/배율)
  - [x] 7-2. `posts` 조회 → 📍 핀 + 클릭 시 사진 팝업 (`addMarker()`, 태스크 8이 그대로 재사용)
- [x] 8. Realtime 구독: 새 게시물 마커 실시간 추가 (`supabase_realtime` publication에 `posts` 추가 — 이걸 안 하면 `.subscribe()`는 `SUBSCRIBED`를 돌려주면서 데이터만 안 온다)
- [ ] 9. 매일 06:00 초기화: Edge Function (cron) + Storage 삭제
- [ ] 10. PWA 마무리: 아이콘, service worker, 설치 프롬프트 + **인앱 브라우저 감지 배너**("Open in Safari" — GPS가 죽으므로)
  - [x] 스캐폴딩 잔해 제거 (2026-08-03): `app/page.tsx`(Next 샘플 화면)와 `public/*.svg` 삭제, `"/"`는 `next.config.ts`의 `redirects()`로 `/map`행 307. `layout.tsx` 제목이 `"Create Next App"`이었고 `manifest.ts` 설명이 한국어였던 것도 수정. `globals.css`가 `body`에 Arial을 박아 Geist가 다운로드만 되고 안 쓰이던 것도 수정
  - **`/map` ↔ `/capture` 이동 수단이 아직 없음** — 주소를 직접 쳐야 함. 여기서 같이 처리할 것
- [ ] 11. 배포 (Vercel + Supabase) + 최종 QA
  - Vercel에 환경변수 3개 등록 (`NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` / `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`)
  - 도메인 확정 후 **Mapbox 토큰에 URL 제한** 걸기 (지금은 무제한)
  - 배포 URL을 README 최상단에 추가 — **인턴 지원용으로 스크린샷보다 이게 큼**

## 포트폴리오 (2026-08-03)

작업자가 **인턴 지원서에 이 레포를 낸다.** 그래서 README·커밋 메시지·레포 메타데이터는 채용 담당자/엔지니어가 읽는 산출물로 취급할 것.

- `README.md`는 **영어**, 설치법이 아니라 **아키텍처 + 판단 근거** 중심으로 작성됨. 첫 섹션이 "브라우저가 DB와 직접 통신하므로 권한 검사가 RLS에 있어야 한다". 결정 6개(3장 제한·Storage 경로 규칙·OTP·Realtime·public 버킷·네이티브 카메라)를 전부 *"안 했으면 뭐가 깨지는가"*로 서술. `Known gaps`도 솔직하게 남김
- GitHub 레포 설명 + 토픽 9개 설정 완료 (`gh repo edit`)
- **데모 스크린샷은 보류 중.** `docs/*.png`가 `.gitignore`에 있음. 이유: `capture.png`에 집 GPS 좌표가 소수점 5자리(≈1m)로 찍혀 있고, public 레포는 나중에 지워도 히스토리에 남는다. 게다가 핀 5개가 전부 한 집에 몰려 있어 "핀이 몰린 곳 = 핫플"이라는 컨셉이 스크린샷에서 안 읽힘
  - **해법(합의됨, 미실행)**: 캠퍼스 좌표로 시드 게시물을 넣고 다시 찍기. Easton Ave 바 거리에 6개를 뭉치고 College Ave에 3개, 나머지 캠퍼스에 흩뿌리면 히트맵이 읽힌다. 준비되면 `.gitignore`에서 `docs/*.png` 줄 삭제

## 나중에 / Open Questions

- **사진 aesthetic 고도화** — 룩 결정 코드는 `PolaroidCanvas`의 `drawImage` 이후 10줄에 전부 모여 있고 다른 곳은 사진 생김새에 의존하지 않음. 매일 06:00 삭제되니 "옛날 필터로 남은 사진" 문제도 없음. 후보: 폴라로이드 프레임(흰 여백+정사각형), 비네팅, 필름 그레인, `ctx.filter` 색보정, 커스텀 폰트
- `posts.mood` 컬럼이 죽어 있음 (핀을 📍로 통일하면서 쓸 데가 없어짐). 태스크 10까지 용처가 안 생기면 컬럼째 삭제
