# RU-Vibe (The Scarlet Drop)

Rutgers `@scarletmail.rutgers.edu` 전용 실시간 파티 히트맵 PWA. `/map`에 라이브 사진이 핀으로 찍히고, **핀이 몰린 곳 = 지금 핫플**.
앱에 표시되는 문구는 전부 영어. 한국어는 대화/이 파일에서만.
스택: Next.js(App Router) + Bun / Supabase(Auth·Postgres·Realtime·Storage) / Mapbox.

## 멘토 규칙

작업자는 CS 3학년, **웹 실무 경험 거의 없음**. 서버/클라이언트·API·컴포넌트·state 같은 기초도 안다고 가정하지 말 것. 인턴 포트폴리오 겸 학습용.

1. 코드보다 **왜 이렇게 짜는지**(트레이드오프) 먼저. 단 **결정을 코드 전에 몰아서 설명하지 말 것** — 필요한 순간에 1개씩
2. **작업 1개 = 체크리스트 1항목**. 항목이 끝나면 확인 없이 바로 `git commit` + `git push` + 이 파일 업데이트 (승인됨)
3. 다음 항목 전에 **이해 확인 질문**. 큰 기능은 코드 전에 구조/데이터 흐름부터 합의
4. 새 개념은 **(1) 없으면 뭐가 불편한지 → (2) 정의 2~3줄 → (3) 지금 왜 필요한지** 순. 용어 질문이 나오면 그 위 상위 개념도 모른다고 가정
5. **안 보이는 계층은 설명하지 말고 보게 할 것.** RLS·`proxy.ts`·버킷 정책은 말로 하면 "그렇다더라"로 남는다. 순서: 작업자가 직접 돌리는 명령 1개 → 결과 → 설명. 필요하면 정책을 잠깐 지워 깨뜨려 보여줄 것
6. **퀴즈는 "지금 ~하면 무슨 결과가 나오나"로.** 실물을 안 본 상태의 "만약 ~했다면"은 순서가 거꾸로. 문제에 코드를 언급하면 그 코드를 문제 안에 붙일 것. 랩(lab) 형식이 가장 잘 먹힘 — 명령 4~5개, 각각이 안 보이는 계층 하나를 드러내고, **매 명령마다 실행 전에 결과를 예상하게 시킨다**(예상이 빗나간 지점 = 모르는 지점). 긴 URL은 터미널에서 잘리니 변수나 스크립트로
7. **원인을 먼저 말해주지 말 것** (태스크 9~). 순서: 증상만 보여준다 → "브라우저 / Next 서버 / Supabase 중 어디일 것 같나" 묻는다 → 좁히는 명령을 작업자가 고르게 한다 → 그다음 설명. 틀려도 좁히는 과정 자체가 목적

### 작업자 상태

- **강한 곳**: 파일에 글자로 적힌 규칙(SQL 정책문, 헤더 값, 파일 흐름). **약한 곳**: 코드에 안 보이는 개입 계층이 "언제 누가 부르는지"
- 완료한 랩: 태스크 6(`proxy.ts` 307 / RLS 42501 / `using(true)` SELECT / public 버킷 200을 `curl`로 확인) · 태스크 8(publication 없이도 `.subscribe()`가 `SUBSCRIBED`를 돌려주는 것 — "구독 등록"과 "데이터 공급"이 별개 계층) · 태스크 9(행을 지워도 파일이 남는 것을 보고 원인을 스스로 말함. 규칙 7을 처음 적용했는데 `net._http_response`의 UTC를 환산해 "함수가 요청을 안 보냈다"까지 혼자 도달)
- 2026-08-04: **저장 장소 3개(state / 쿠키 / localStorage)** 를 Network 탭의 Request Headers로 직접 확인. `@supabase/ssr`이 세션을 쿠키에 넣는 이유(=②가 읽어야 하니까)까지 스스로 연결함. `net._http_response`의 UTC 시각 확인도 이번엔 시키지 않았는데 먼저 함
- 남은 약점: **비동기**(요청을 보냈다 ≠ 결과가 나왔다). UTC↔ET는 개선 중
- **반복해서 나온 패턴 3회**(2026-08-04): apple-touch-icon 0/1, UA 새로고침, Mapbox 스타일 JSON. 전부 *"안 막혔다/안 나온다"의 원인이 설정이 아니라 **내가 엉뚱한 곳을 재고 있었던 것***. 다음에 같은 증상이 나오면 "설정 의심" 전에 **"내가 맞는 문을 두드렸나"** 부터 묻게 할 것
- **공유 어휘** (설명할 때 재사용): **장소 3개** — ① 브라우저 / ② Next 서버 / ③ Supabase. 핵심은 ①이 ②를 건너뛰고 ③과 직접 통신한다는 것. **개입 계층 4개** — `proxy.ts`(②, UX용·우회 가능) / `posts` RLS(③) / Storage 정책(③) / `supabase_realtime` publication(③)
- 진로 판단: **깊이보다 넓이**(프로덕트 개수). 웹소켓 내부·논리복제 같은 건 보류하고, 대신 규칙 7로 디버깅 자립을 보완

## 결정 사항

**흐름**: `/map`이 랜딩(비로그인 조회 허용, 노출 > 배타성) → 우상단 Sign in/out으로 상태 표시 → 로그인해야 📸 Post 버튼이 나타남 → `/capture` → 게시 후 `/map`. 로그인 성공도 `/map`으로 돌아온다.
`/map`은 `getSession()`(쿠키 해독, 네트워크 왕복 없음)으로 상태만 읽는다. 위조해도 INSERT는 RLS가 막으므로 표시용엔 이거면 충분.

**서버 강제**: 촬영 시간 제한 없음(24/7). 하루 3장 제한은 INSERT 시 RLS에서 카운트, America/New_York 06:00 리셋.

**로그인: 6자리 OTP** (매직 링크에서 변경) — 메일 앱이 링크를 인앱 브라우저로 여는데 세션 쿠키는 브라우저별로 따로라, 유저가 나중에 Safari로 열면 로그아웃. 코드는 유저가 눈으로 읽어 원래 화면에 입력하므로 브라우저를 안 건너간다. **대시보드 → Email Templates → Magic Link 에 `{{ .Token }}` 필수.**

**Storage: `photos` 버킷, 읽기 public / 쓰기 `<uid>/` 폴더만**
- 업로드는 브라우저 → Supabase **직접**. 우리 서버 경유는 전송량 2배인데 권한 검사는 Storage RLS가 이미 함
- public인 이유: `/map`이 비로그인 공개라 `<img src>`가 그냥 열려야 함. private이면 사진마다 signed URL(핀 50개 = 호출 50번)
- `photo_url`엔 **전체 public URL** 저장. 보통은 경로만 저장하는 게 정석이지만 매일 06:00에 비워지므로 썩을 과거 데이터가 없음

**Mapbox 토큰: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`** (public `pk.`, 시크릿 스코프 0개). `NEXT_PUBLIC_`은 "공개해도 된다"가 아니라 **빌드 시 값을 브라우저 JS에 글자 그대로 박으라는 명령** — 스코프를 하나라도 켜면 그 권한이 전 세계에 뿌려진다. 타일 렌더링은 스코프 없이 되는 기본 권한.
**좌표 순서: Mapbox는 `[lng, lat]`, `posts`는 `lat`/`lng`.** 뒤집어도 에러 없이 지도 반대편에 찍힌다.
커스텀 element 마커엔 **`anchor: "bottom"` 필수** (기본값은 요소 한가운데를 좌표에 맞추는데 📍는 아래 끝이 가리키는 그림). 핀은 무드별로 나누지 않고 **전부 📍 하나**. `posts.mood`는 그래서 죽어 있다가 **2026-08-04에 삭제**(`20260804010000_drop_mood.sql`) — `posts`와 `posts_archive` 양쪽에서 동시에. `reset_daily()`의 `insert into posts_archive select *`가 **이름이 아니라 순서**로 짝을 맞춰서 한쪽만 지우면 06:00 리셋이 통째로 깨진다.

**PWA** — 설치 조건 4개: manifest(`display: standalone`) / 아이콘 / service worker(Chrome만) / **HTTPS**. `localhost`는 예외라 배포 전엔 진짜 설치를 확인할 수 없다.
- 아이콘은 장식이 아니라 **설치 조건**. `next/og`로 한 번 그려 `public/icon-{192,512}.png` + `app/apple-icon.png`로 커밋(런타임 생성 0). **아이폰은 manifest의 `icons`를 안 보고** `app/apple-icon.png`라는 *파일 이름*을 Next가 잡아 `<link rel="apple-touch-icon">`을 넣는다
- `manifest.ts`에 **`id` 고정** — 없으면 `start_url`이 앱의 신분증이 되어, 시작 화면을 옮기는 순간 설치된 아이콘이 전부 고아가 된다
- `sw.js`는 **캐시 0**. 화면이 전부 "지금" 데이터라 캐시된 화면은 느린 화면보다 나쁘다. `fetch` 핸들러가 **있다는 사실 자체**가 Chrome의 설치 조건
- **`beforeinstallprompt` 커스텀 버튼 없음** — 안드로이드/데스크톱 Chrome은 주소창에 설치 아이콘을 직접 띄운다. **아이폰만 프롬프트가 없어서** 말로 안내가 필요하고, iOS는 코드로 "홈 화면에 추가"를 실행하는 걸 금지한다
- **안내의 ×는 삭제가 아니라 접기**(`📲 Install` 알약). 유저 대부분이 PWA 설치를 해본 적이 없어서, 한 번 닫아 사라지면 방법을 다시 찾을 길이 없다

**폴라로이드 룩** (`PolaroidCanvas`) — 프레임은 **실물 스캔 사진**(`public/frame.jpg`)이다. 종이 질감·색 얼룩·모서리 곡선은 코드로 그리면 아무리 공들여도 균일해서 인쇄물처럼 보인다. 흰 창의 픽셀 좌표를 재서 `FRAME` 상수에 박아두고 그 안에 사진을 넣는다 — **프레임 사진을 갈면 이 값도 다시 재야 함.**
- **모서리를 둥글게 못 깎는 이유**: JPEG엔 투명이 없어서 깎인 바깥이 검게 채워진다. PNG면 되지만 파일이 5~10배. 그래서 실물 스캔을 쓰는 것이 유일하게 싼 해법이었다
- 색은 `ctx.filter`(채도·대비 살짝) + 합성모드 4단계: `multiply` 찬 색으로 **황색 빼기** → `lighten`으로 **검정 살짝 들어올리기** → `screen`으로 하이라이트에 온기(그림자는 차갑고 밝은 쪽은 따뜻한 **split tone** — 이 어긋남이 "필름 같다"의 정체) → 비네팅 → `overlay` 그레인 2겹(굵은 층이 "필름이다"를 말하고, 미세한 층이 굵은 층의 격자무늬를 흐트러뜨린다). 96px 노이즈 타일 반복 — 121만 픽셀 루프보다 훨씬 쌈
- **방향을 한 번 크게 틀렸다**: 레퍼런스가 물 빠진 폴라로이드인 줄 알고 채도·대비를 뭉갰는데, 작업자가 준 `r1`/`r2`는 **35mm 필름 스캔**이었다 — 검정은 검고 채도도 살아 있고 전체가 차갑고 깨끗하다. 대비를 죽이면 필름이 아니라 그냥 흐린 사진이 된다
- 캡션(`📍 좌표 · Aug 4, 2026 · 9:04 PM`)은 **좌표가 도착한 뒤 흰 여백에 덧그린다.** GPS는 셔터 몇 초 뒤에 오는데 여백은 빈 종이라 덧그리기만 하면 되고 사진을 다시 그릴 필요가 없다
- **사진에 새기는 좌표는 소수점 3자리(≈110m)**, 화면에는 5자리(≈1m). 이 이미지는 public URL로 나가고 인스타로도 퍼진다 — 5자리면 어느 방에서 찍었는지가 박힌다
- 달 이름은 배열로 직접 적음. `toLocaleString()`은 폰 언어를 따라가서 한국어 폰에서 `8월`이 나온다
- 다이얼은 `gradeFilm` 안의 alpha 값들. **한 번에 하나씩** 만질 것

**카메라: 네이티브 카메라 앱** (`<input type="file" accept="image/*" capture="environment">`). `getUserMedia` 커스텀 뷰파인더에서 갈아탐 — 화질이 훨씬 좋고 iOS 삽질이 사라짐. 대신 라이브 뷰파인더 위에 UI를 못 얹음.

**06:00 리셋은 삭제가 아니라 아카이빙** — private `archive` 버킷 + `posts_archive`로 이동(작업자 보존용, 앱에서 조회 안 함).
- **Edge Function 대신 pg_cron + pg_net**: 하는 일이 "파일 옮기고 행 옮기고 지우기"뿐인데 Deno 런타임 + 배포 파이프라인 + 깨울 cron + 키가 다 따라온다. cron은 어차피 필요하므로 pg_cron 하나로
- **cron은 매시 정각(`0 * * * *`), 06시 판단은 함수 안에서 뉴욕 시각으로.** `0 10 * * *`로 박으면 서머타임 때문에 1년에 두 번, **에러 없이** 1시간 어긋난다
- service_role 키는 **Vault**에 (`vault.create_secret`, 코드는 `vault.decrypted_secrets`에서 읽음). 새 함수는 기본이 "누구나 실행 가능"이라 `revoke execute ... from public, anon, authenticated` 필수

## 하드 러닝 (반복 삽질 금지)

**행을 지워도 파일은 안 지워진다** — `posts` 행과 Storage 파일은 별개 저장소, `photo_url`은 그냥 텍스트. `delete from posts` 후에도 그 URL은 200으로 사진을 계속 내놓는다. 파일을 진짜 움직이려면 **Storage API에 HTTP 요청**(→ `pg_net`)이 필요.
- `net.http_post`는 **비동기**. 요청 id만 즉시 돌려주고 **실패해도 그 자리에서 에러가 안 난다** → `select status_code, created from net._http_response order by created desc limit 5;`. `created`는 UTC라 ET로 환산해야 "방금 것"인지 안다
- 이동은 `POST /storage/v1/object/move` + `{bucketId, sourceKey, destinationBucket, destinationKey}`, 파일당 1콜
- **404 두 종류**: 옮겨진 파일의 옛 URL → `NoSuchKey`(버킷은 있음). private 버킷의 public URL → `NoSuchBucket`(`/object/public/…` 창구는 public 버킷만 안다)

**폰 실기기 테스트** — 카메라/GPS는 **secure context**(HTTPS 또는 localhost)에서만. 폰에서 `http://<맥 IP>:3000`은 페이지만 보이고 기능은 죽음.
```bash
bun dev                                          # 터미널 1
cloudflared tunnel --url http://localhost:3000   # 터미널 2
```
- `next.config.ts`의 `allowedDevOrigins: ["*.trycloudflare.com"]` **필수**. 없으면 HMR 웹소켓 거절 → 하이드레이션 실패 → **화면은 멀쩡한데 버튼이 전부 먹통**. 증상이 "카메라가 안 켜진다"로 보여서 오래 걸렸음
- 확장 프로그램이 `<html>`에 속성 주입해 나는 하이드레이션 경고는 우리 버그 아님

**서버 리다이렉트 목적지는 헤더에서 조립** — route handler·`proxy.ts`에서 `new URL(request.url)`을 쓰면 터널 뒤에서 `https://localhost:3000/login` 잡종이 나온다. 범인은 터널이 아니라 Next(자기 listen 주소로 조립하고 proto만 `x-forwarded-proto`에서 가져옴). 증상은 "로그인이 안 된다"로 보이지만 실제로는 로그인은 성공했고 마지막 이동만 깨진 것.
```ts
const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
const proto = request.headers.get("x-forwarded-proto") ?? "http";
return NextResponse.redirect(new URL("/login", `${proto}://${host}`));
```
상대 경로만 넣는 방법은 route handler에선 되지만 **`proxy.ts`에선 `ERR_INVALID_URL`**.

**Next 16은 `middleware.ts` → `proxy.ts`** (export 이름도 `proxy`).

**Mapbox 레이어는 `map.on("load")` 안에서만 추가할 수 있다** — 스타일(도로·건물 정의)은 네트워크로 받아오는 것이라, 지도를 만들자마자 `addSource`를 부르면 "스타일이 없다"고 터진다. 조회가 먼저 끝날 수도 있으므로 데이터 반영 함수를 load에서 한 번 더 부른다.
- `heatmap-color`의 밀도 0은 **반드시 완전 투명**. 아니면 게시물 없는 캠퍼스 전체가 옅게 물든다
- **DOM 마커는 뭉쳐지지 않는다.** 클러스터링을 쓰려면 source+layer로 갈아야 하는데, 열지도는 캔버스 *안*이고 마커는 그 위 HTML이라 **층이 달라서** 그냥 아래에 깔면 기존 코드가 한 줄도 안 바뀐다
- 보일지 말지는 `setLayoutProperty(..., "visibility", ...)`로. 데이터를 비우는 방식은 "지금 몇 개인가"를 두 군데서 관리하게 된다

**"지원하니?"를 물었는데 브라우저가 실물을 검사한 사례** (2026-08-04) — `navigator.canShare({ files: [new File([], "x.jpg")] })`가 iOS에서 false. 0바이트짜리 가짜 파일을 진짜로 검사해서 "이건 공유 못 한다"고 답한 것이고, 증상은 "공유 버튼이 안 뜬다"로만 보였다. **기능 지원 여부를 물을 때 가짜 인자를 넘기면 그 인자가 평가된다.**

**신형 Supabase API 키는 JWT가 아니다** (2026-08-04) — `sb_publishable_`/`sb_secret_`는 점(`.`)이 0개인 그냥 긴 문자열이라 서버가 목록에서 찾아보는 방식이다. 창구가 다르다:
- `Authorization: Bearer` = **JWT 전용**. 여기에 신형 키를 넣으면 Storage가 세 조각으로 쪼개려다 실패하고 HTTP **400 + `{"message":"Invalid Compact JWS"}`**. 키가 틀린 게 아니라 줄을 잘못 선 것이라 증상만 보면 원인이 안 보인다
- `apikey` = **신형 키가 갈 곳**
- `supabase-js`는 알아서 맞춰준다. **`pg_net`으로 HTTP를 손수 조립할 때만** 우리가 정해줘야 한다 — `reset_daily()`가 그 유일한 자리
- Storage는 바깥 HTTP status와 본문의 `"statusCode"`가 자주 안 맞는다(400인데 본문엔 403/404). 믿을 건 바깥, 진단에 쓸 건 `message`

**관문 테스트 설계: 뒤에서 실패시켜 앞을 검증한다** (2026-08-04) — 인증만 확인하고 싶은데 진짜로 성공시키면 파일이 옮겨져 지도가 깨지는 상황. **다음 관문에서 반드시 실패하는 입력**(`sourceKey: 'does-not-exist.jpg'` — 실제 경로는 `<uid>/<uuid>.jpg` 꼴이라 존재 불가)을 넣으면 답이 둘로 갈린다: `Invalid Compact JWS`(인증에서 막힘) / `NoSuchKey`(인증 통과, 파일 찾기까지 감). **404라고 다 같은 404가 아니고 어느 404냐가 정보다.**

**인앱 브라우저(Gmail/인스타 앱 안의 브라우저)에서 geolocation이 죽는다** — 팝업도 안 뜨고 성공/실패 콜백 둘 다 안 불려 `locating…`에 무한 정지(`timeout`은 권한 허용 *이후*부터 세서 타이머조차 시작 안 함). 위치 권한이 사이트가 아니라 그 앱 자체를 따라감. 카메라는 되는데 GPS만 죽어 원인이 안 보인다. → Safari로 열어야 하고, 세션 쿠키는 브라우저별로 따로라 재로그인 필요.

**Canvas** — `MAX_EDGE=2048`로 긴 변 제한 필수(iOS Safari는 캔버스가 크면 **에러 없이 빈 이미지**를 내놓고 48MP 아이폰 사진이 여기 걸림). `createImageBitmap`엔 `imageOrientation:"from-image"` 필요(없으면 세로 사진이 눕는다).

**이메일: Brevo SMTP** — `{{ .Token }}`을 넣으려면 템플릿 편집이 필요한데 **Supabase는 커스텀 SMTP 없이는 템플릿을 잠근다**. Brevo는 도메인 없이 발신자 주소만 인증하면 됨(무료 300통/일). 실패한 것들: Gmail(앱 비밀번호 535), Resend(도메인 인증 전엔 가입 계정 주소로만).
- 커스텀 SMTP를 켜면 발송 제한 시간당 2 → 30
- **Brevo IP 검사**: Supabase 발송 IP가 바뀌면 차단되고 증상은 "코드가 안 온다"로만 보임 (Brevo 메일로 authorize 요청이 옴)
- **스팸함으로 감** — SPF/DKIM이 없어서 정상. 진짜 해결은 태스크 11에서 도메인 + DNS 레코드
- **OTP 길이는 대시보드 설정값**(기본 6, 최대 10). 클라이언트 `maxLength`에 박으면 잘려서 "코드가 계속 틀리다"로만 보임

## 태스크 체크리스트

- [x] 1~11. 스캐폴딩 / Supabase / OTP 인증 / `posts`+RLS(3장/일) / Capture / Storage 업로드 / Map+핀 / Realtime / 06:00 리셋 / PWA / **배포**(`ru-vibe.vercel.app`, 푸시하면 자동 재배포). 근거는 전부 위 **결정 사항**과 **하드 러닝**에
- [x] 13. **히트맵** — `/map`에 열지도 layer, 게시물 5개 미만이면 숨김(1개짜리 글로우는 핫플이 아니라 얼룩)
- [x] 14. **공유** — 게시 후 `navigator.share({ files })`
- [ ] **폰 실기기 QA**: 촬영→Post→핀, 홈 화면 설치, 인앱 배너, 새 폴라로이드 룩
- [ ] 2026-08-05 아침: 06:00 리셋이 **새 키 + `apikey` 헤더**로 실제로 도는지 `net._http_response`로 확인 (그 조합의 첫 실전)
- [ ] 데모 스크린샷 → 레쥬메 업데이트
- [ ] 12. **이해 점검 문답** — 맨 마지막. 본인 표현: *"이 프로젝트를 완벽하게 이해하지 못하고 있는 것 같다"*. 목표: **면접에서 "이 프로젝트 설명해보세요"에 막힘없이 답하기**. 주제:
  1. 요청 1회의 전 경로 — 주소창 → `proxy.ts` → 페이지 → Supabase, 각 단계에서 누가 뭘 결정하나
  2. 왜 방어가 RLS에 있어야 하나 — ①이 ②를 건너뛴다는 것의 의미
  3. 서버/클라이언트 컴포넌트와 hydration — `"use client"`가 실제로 바꾸는 것
  4. state·`useEffect`·의존성 배열 — 언제 다시 도나
  5. ~~저장 장소 3개~~ ✅ 2026-08-04 완료
  6. RLS 정책문 읽기 — `auth.uid()`, `using` vs `with check`
  7. Realtime — publication(공급)과 subscription(등록)이 별개 계층
  8. Storage — public/private, 경로 정책, orphan 파일
  9. pg_cron + pg_net의 비동기 (약점으로 기록됨)
  10. 빌드 타임 치환(`NEXT_PUBLIC_`)과 배포 환경변수
  11. **각 결정의 트레이드오프를 말로 설명하기** — README의 결정 7개가 그대로 면접 답변. 나머지 10개는 이걸 받치는 재료

## 포트폴리오

작업자가 **인턴 지원서에 이 레포를 낸다.** README·커밋 메시지·레포 메타데이터는 채용 담당자가 읽는 산출물로 취급할 것.
`README.md`는 영어 62줄, 설치법이 아니라 **아키텍처 + 판단 근거** 중심 — 첫 섹션이 "브라우저가 DB와 직접 통신하므로 방어가 RLS에 있어야 한다", 결정 7개를 전부 *"안 했으면 뭐가 깨지는가"*로 서술, `Known gaps`도 솔직하게. 레포 설명 + 토픽 9개 설정 완료.

**데모 스크린샷 보류 중** (`docs/`가 통째로 `.gitignore`): 집 GPS가 5자리로 찍혀 있고, 핀이 한곳에 몰려도 컨셉이 안 읽혔다(→ 히트맵으로 해결됨). public 레포는 지워도 히스토리에 남는다.
→ **해법(합의됨, 미실행)**: 캠퍼스 좌표로 시드 게시물 — Easton Ave에 6개, College Ave에 3개, 나머지 흩뿌리고 다시 촬영. 그때 `manifest.ts`의 `screenshots`에도 넣을 것(`form_factor: "wide"` 1장 + 미지정 1장 → 설치 대화상자에 미리보기가 생긴다). 올릴 파일만 `git add -f`

## 나중에

- **아카이브를 유저에게 보여주는 기능** — `archive`가 private이라 signed URL이 필요하고 `posts_archive`엔 grant가 없어 조회 경로부터 새로 만들어야 함
