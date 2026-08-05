-- reset_daily(): 인증 헤더를 Authorization -> apikey 로 변경.
--
-- 왜 바꾸나:
--   태스크 9 작업 중 service_role 키가 채팅에 노출돼서 새 키를 발급했는데,
--   Supabase가 키 체계를 바꾸는 중이라 새로 발급되는 키의 종류가 다르다.
--
--     옛 service_role 키 : JWT. 점(.)으로 세 조각. 서버가 서명을 계산해 위조를 판별한다.
--                          -> Authorization: Bearer 창구
--     새 sb_secret_ 키   : 그냥 긴 임의 문자열. 점이 0개. 서버가 자기 목록에서 찾아본다.
--                          -> apikey 창구
--
--   옛 코드 그대로 새 키를 Authorization에 넣으면 Storage가 그걸 JWT로 뜯으려다 실패하고
--   HTTP 400 + {"message":"Invalid Compact JWS"} 를 돌려준다("세 조각짜리를 기대했다"는 뜻).
--   키가 틀린 게 아니라 창구를 잘못 고른 것이라, 증상만 보면 원인이 안 보인다.
--
-- Vault의 이름(service_role_key)은 그대로 둔다. 값만 새 키로 교체돼 있다.

create or replace function public.reset_daily()
returns void
language plpgsql
as $$
declare
  key text := (select decrypted_secret from vault.decrypted_secrets
               where name = 'service_role_key');
begin
  -- cron은 매시 정각에 깨우고, 06시 판단은 여기서 뉴욕 시각으로 한다.
  -- UTC 시각을 cron에 박으면 서머타임 때문에 1년에 두 번 조용히 1시간 어긋난다.
  if extract(hour from (now() at time zone 'America/New_York')) <> 6 then
    return;
  end if;

  -- ① 사진 파일: photos -> archive 이동 요청.
  --    파일은 SQL로 못 움직인다(storage.objects 행을 지워도 바이트는 남는다).
  --    Storage API에 HTTP 요청을 보내야 하고, 그 수단이 pg_net이다.
  --
  --    net.http_post는 비동기다 — 요청 id만 즉시 돌려주고 실패해도 여기서 에러가 안 난다.
  --    확인: select status_code, content from net._http_response order by created desc limit 5;
  perform net.http_post(
    url := 'https://fjxkwyrmmfuhigipitrr.supabase.co/storage/v1/object/move',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- 여기가 바뀐 유일한 줄. 이 키는 RLS를 통째로 무시하므로
      -- archive 버킷에 정책이 하나도 없어도 이 요청만 통과한다.
      'apikey', key
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

  -- ② 게시물 행: 아카이브로 복사한 뒤 원본을 비운다. 이쪽은 실패하면 즉시 에러가 난다.
  insert into public.posts_archive select * from public.posts;
  delete from public.posts;
end;
$$;

-- create or replace는 기존 권한을 유지하지만, 이 함수는 anon이 부를 수 있으면
-- 앱을 통째로 비울 수 있는 물건이라 명시적으로 다시 막아둔다(여러 번 돌려도 안전).
revoke execute on function public.reset_daily() from public, anon, authenticated;
