-- 하루 3장 제한을 면제받는 계정.
--
-- 왜 필요한가: 히트맵은 게시물이 몇 개 몰려야 의미가 생기는데, 만든 사람이
-- 하루 3장에 묶여 있으면 캠퍼스에 시드 데이터를 뿌리는 데 며칠이 걸린다.
-- 데모 스크린샷과 초기 분위기 조성용이다.
--
-- 왜 코드에 uid를 안 박나: 이 파일은 public 레포에 올라간다. 표만 만들어두고
-- **누가 관리자인지는 대시보드에서 직접 넣는다** — 레포에는 아무 정보도 안 남는다.

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.admins enable row level security;

-- 자기가 관리자인지만 확인할 수 있다. 남의 행은 안 보인다.
--
-- 정책이 왜 필요한가: RLS를 켜면 기본이 "아무도 못 읽음"이라, 아래 can_post()가
-- 이 표를 조회할 때도 막힌다(함수는 부른 사람의 권한으로 돈다). 이 한 줄이 없으면
-- 관리자도 그냥 일반 유저처럼 3장에서 막힌다 — 그리고 에러 없이 조용히 그렇게 된다.
create policy "you can see your own admin row"
  on public.admins for select
  using (auth.uid() = user_id);

grant select on public.admins to authenticated;

-- ── 제한 함수 갱신 ──────────────────────────────────────────────
-- 기존과 같되 맨 앞에 "관리자면 무조건 통과" 한 줄이 붙었다.
-- or는 앞이 참이면 뒤를 아예 계산하지 않으므로, 관리자는 개수를 세지도 않는다.
create or replace function public.can_post(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (select 1 from public.admins a where a.user_id = uid)
     or (select count(*) from public.posts p
         where p.user_id = uid
           and p.created_at >= (
             date_trunc('day', (now() at time zone 'America/New_York') - interval '6 hours')
             + interval '6 hours'
           ) at time zone 'America/New_York'
        ) < 3
$$;

-- 관리자로 만들려면 대시보드 SQL Editor에서 (uid는 Authentication → Users 에서 복사):
--   insert into public.admins (user_id) values ('여기에-내-uuid');
