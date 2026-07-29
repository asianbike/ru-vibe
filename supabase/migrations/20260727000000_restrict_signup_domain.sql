-- Before User Created Auth Hook: @scarletmail.rutgers.edu 도메인만 가입 허용
-- 클라이언트 체크는 우회 가능하므로, 실제 차단은 여기(DB)에서.
create or replace function public.restrict_signup_to_scarletmail(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  user_email text := event->'user'->>'email';
begin
  if user_email !~* '^[^@]+@scarletmail\.rutgers\.edu$' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Only @scarletmail.rutgers.edu emails are allowed.',
        'http_code', 403
      )
    );
  end if;

  return jsonb_build_object();
end;
$$;

-- Supabase Auth가 이 함수를 호출할 수 있게 권한 부여, 나머지 role은 접근 차단
grant usage on schema public to supabase_auth_admin;

grant execute
  on function public.restrict_signup_to_scarletmail
  to supabase_auth_admin;

revoke execute
  on function public.restrict_signup_to_scarletmail
  from authenticated, anon, public;
