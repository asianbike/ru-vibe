-- 태스크 9-2: 매일 06:00(America/New_York) 리셋.
--
-- 이 태스크는 처음으로 "브라우저도 Next 서버도 관여하지 않는" 코드다.
-- 유저가 앱을 안 켜도 06:00에 돌아야 하므로, 스스로 깨어나는 주체가 필요하다.
-- 그 역할이 pg_cron(=Postgres 안의 크론)이고, 그게 아래 함수를 부른다.
--
-- 선행 조건 (대시보드에서 손으로 한 번씩):
--   1. Database -> Extensions 에서 pg_cron, pg_net 켜기
--   2. select vault.create_secret('<service_role 키>', 'service_role_key');
--      (키를 이 파일에 적으면 공개 레포에 마스터 키를 올리는 셈이라 Vault에 둔다)

-- ── 리셋 함수 ──────────────────────────────────────────────────────
create or replace function public.reset_daily()
returns void
language plpgsql
as $$
declare
  -- Vault에서 키를 꺼낸다. 이 함수를 부를 수 있는 건 아래 revoke 때문에 postgres뿐이다.
  key text := (select decrypted_secret from vault.decrypted_secrets
               where name = 'service_role_key');
begin
  -- 지금이 뉴욕 06시가 아니면 아무것도 안 하고 끝낸다.
  --
  -- cron은 UTC로 도는데 뉴욕은 서머타임 때문에 UTC와의 차이가 1년에 두 번 바뀐다
  -- (여름 -4시간, 겨울 -5시간). '0 10 * * *' 같이 UTC 시각을 박아두면
  -- 11월 어느 날부터 조용히 1시간 어긋난다 — 에러도 안 나서 알아채기 어렵다.
  -- 그래서 매시 깨어나되, 판단은 뉴욕 시각으로 한다. 깨어나서 이 if만 보고
  -- 돌아가는 게 하루 23번이지만 비용은 사실상 0이다.
  if extract(hour from (now() at time zone 'America/New_York')) <> 6 then
    return;
  end if;

  -- ① 사진 파일: photos -> archive 로 이동 요청.
  --
  -- 파일은 SQL로 못 지운다/못 옮긴다. storage.objects 의 행을 건드려봐야
  -- 실제 파일 바이트는 그대로 남는다(=orphan). 진짜로 움직이려면 Storage API에
  -- HTTP 요청을 보내야 하고, Postgres가 HTTP를 쏘는 수단이 pg_net이다.
  --
  -- 주의: net.http_post 는 비동기다. 요청 id만 즉시 돌려주고 실제 응답은 나중에
  -- net._http_response 테이블에 도착한다. 그래서 실패해도 여기서 에러가 안 난다.
  -- 확인 방법: select * from net._http_response order by created desc limit 10;
  --
  -- ponytail: 파일 1개당 요청 1개. 하루 수십~수백 장 규모라 충분하다.
  --           수천 장이 되면 파일 여러 개를 한 번에 지우는 bulk 엔드포인트로 바꿀 것.
  perform net.http_post(
    url := 'https://fjxkwyrmmfuhigipitrr.supabase.co/storage/v1/object/move',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- service_role 키는 RLS를 통째로 무시한다. archive 버킷에 정책이 하나도
      -- 없는데도 이 요청만 통과하는 이유가 이것.
      'Authorization', 'Bearer ' || key
    ),
    body := jsonb_build_object(
      'bucketId', 'photos',
      'sourceKey', o.name,
      'destinationBucket', 'archive',
      'destinationKey', o.name     -- 경로(<uid>/xxx.jpg)는 그대로 유지
    )
  )
  from storage.objects o
  where o.bucket_id = 'photos';

  -- ② 게시물 행: 아카이브 테이블로 복사한 뒤 원본을 비운다.
  -- 이쪽은 그냥 SQL이라 즉시, 그리고 확실하게 끝난다. ①과 달리 실패하면 에러가 난다.
  insert into public.posts_archive select * from public.posts;
  delete from public.posts;
end;
$$;

-- Postgres는 새 함수에 대해 기본적으로 "누구나 실행 가능(public)" 권한을 준다.
-- 그대로 두면 anon 방문자가 RPC로 reset_daily()를 불러 앱을 통째로 비울 수 있다.
-- 실행할 주체는 cron(=postgres) 하나뿐이므로 나머지는 전부 회수한다.
revoke execute on function public.reset_daily() from public, anon, authenticated;

-- ── 스케줄 등록 ────────────────────────────────────────────────────
-- '0 * * * *' = 매시 정각. 06시인지 판단은 위 함수 안에서 뉴욕 시각으로 한다.
-- 등록된 목록은 cron.job, 실행 이력은 cron.job_run_details 테이블에서 그냥 SELECT로 볼 수 있다.
-- 같은 이름으로 다시 부르면 새로 쌓이지 않고 덮어쓴다(=이 파일을 두 번 돌려도 안전).
select cron.schedule('daily-reset', '0 * * * *', $$ select public.reset_daily(); $$);
