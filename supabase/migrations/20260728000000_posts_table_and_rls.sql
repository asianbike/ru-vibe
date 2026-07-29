-- posts 테이블: 파티 히트맵에 찍히는 게시물 1개 = 행 1개
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_url text not null,        -- 실제 업로드/Storage 연동은 태스크 6에서
  lat double precision not null,
  lng double precision not null,
  mood text not null,             -- 클라이언트가 로컬 랜덤으로 고른 무드 이모지
  created_at timestamptz not null default now()
);

-- can_post()가 유저별 게시 개수를 셀 때 이 인덱스로 빠르게 조회
create index posts_user_created_idx on public.posts (user_id, created_at);

alter table public.posts enable row level security;

grant select on public.posts to anon, authenticated;
grant insert on public.posts to authenticated;

-- 마지막 06:00(America/New_York) 리셋 이후 3장 제한. 24/7 촬영 허용으로 변경(2026-07-28).
-- 클라이언트가 보낸 시간은 신뢰하지 않고 DB의 now()만 사용.
create or replace function public.can_post(uid uuid)
returns boolean
language sql
stable
as $$
  select
    (select count(*) from public.posts p
     where p.user_id = uid
       and p.created_at >= (
         date_trunc('day', (now() at time zone 'America/New_York') - interval '6 hours')
         + interval '6 hours'
       ) at time zone 'America/New_York'
    ) < 3
$$;

create policy "posts are publicly readable"
  on public.posts for select
  using (true);

create policy "authenticated users can post within rules"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = user_id and public.can_post(auth.uid()));
