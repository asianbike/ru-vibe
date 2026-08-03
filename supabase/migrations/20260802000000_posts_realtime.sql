-- posts의 변경사항을 Realtime 서버로 흘려보낸다.
--
-- publication = "이 테이블들의 변경사항을 밖으로 내보내라"는 Postgres의 목록.
-- supabase_realtime은 Supabase가 미리 만들어 둔 빈 목록이고, 여기에 테이블을
-- 넣기 전까지 Postgres는 아무것도 내보내지 않는다.
--
-- 이게 없어도 클라이언트의 .subscribe()는 SUBSCRIBED를 돌려준다 —
-- 구독 등록은 Realtime 서버가 받아주고, 데이터를 흘려보내는 건 Postgres라서
-- 서로 모른다. 그래서 안 켠 상태의 증상은 "에러 없이 그냥 조용함"뿐이다.
alter publication supabase_realtime add table public.posts;

-- 참고: Realtime도 RLS를 지킨다. 구독자에게 행을 보내기 전에 그 구독자의 역할로
-- SELECT가 가능한지 확인한다. posts의 SELECT 정책은 using(true)라
-- 비로그인(anon) 방문자도 새 핀을 받는다 — /map이 공개인 우리 설계와 맞다.
-- 만약 SELECT를 로그인 유저로 좁히면, 이 파일을 고치지 않아도 실시간이 조용해진다.
