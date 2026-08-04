-- 태스크 9-1: 06:00 리셋이 "옮겨 담을 곳" 두 개.
-- 실제로 옮기고 지우는 cron은 9-2에서. 여기는 목적지만 만든다.
--
-- 리셋이 지우는 대상이 두 군데라, 받는 곳도 두 개다:
--   posts 행    -> public.posts_archive (Postgres 테이블)
--   photos 파일 -> archive 버킷        (Storage)
-- 행과 파일이 서로 모르는 별개 저장소라는 게 이번 태스크의 전제다.

-- ── 1. archive 버킷 ────────────────────────────────────────────────
-- photos 버킷과 똑같이 storage.buckets 에 행 하나 INSERT 하는 것뿐이다.
insert into storage.buckets (id, name, public)
values (
  'archive',
  'archive',
  -- public = false. photos가 public이었던 이유는 /map의 <img src>가 로그인 없이
  -- 열려야 해서였는데, 아카이브는 앱에서 보여줄 일이 없다. 열어둘 이유가 없으면 닫는다.
  -- private 버킷은 URL을 알아도 401이 나고, 읽으려면 signed URL이나 service_role 키가 필요하다.
  false
)
on conflict (id) do nothing;

-- 정책(policy)은 일부러 하나도 안 만든다.
-- storage.objects 에는 RLS가 켜져 있고, 정책이 없으면 기본값은 "아무도 못 한다"이다.
-- 여기에 파일을 넣는 건 9-2의 cron이고, 그건 service_role 키로 도는데
-- service_role은 RLS를 통째로 무시한다. 즉 정책 없이도 cron만 통과한다.

-- ── 2. posts_archive 테이블 ────────────────────────────────────────
-- like public.posts = "posts와 똑같은 컬럼 구성으로 만들어라".
-- 컬럼을 손으로 다시 적지 않으므로 posts가 바뀌어도 여기 오타가 날 일이 없다.
--
-- 일부러 안 가져오는 것들:
--   - 기본키/인덱스: 아카이브는 조회할 일이 거의 없다. 인덱스는 쓰기를 느리게만 한다.
--   - user_id의 외래키(references auth.users on delete cascade): 이게 있으면
--     유저가 탈퇴할 때 아카이브까지 같이 지워진다. 보존이 목적인데 그러면 안 된다.
--   (like 는 원래 제약조건/인덱스를 안 가져온다. including 옵션을 줘야 가져온다.)
create table if not exists public.posts_archive (like public.posts);

-- grant를 아무에게도 주지 않는다. anon/authenticated는 이 테이블에 SELECT조차 못 한다.
-- (public.posts 는 grant select ... to anon 이 있어서 /map이 읽을 수 있었던 것.)
-- 혹시 나중에 누가 grant를 주더라도 한 겹 더 막히도록 RLS도 켜둔다. 정책은 안 만든다.
alter table public.posts_archive enable row level security;
