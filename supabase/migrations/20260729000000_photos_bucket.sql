-- 사진 파일이 실제로 저장될 곳. DB에는 URL 문자열만 남고, 바이트는 전부 여기 들어간다.
--
-- storage.buckets / storage.objects 는 Supabase가 미리 만들어둔 시스템 테이블이다.
-- 즉 버킷 "생성"은 특별한 명령이 아니라 그냥 buckets 테이블에 행 하나 INSERT 하는 것이고,
-- 파일 하나 = objects 테이블의 행 하나다. 그래서 posts에 쓴 RLS를 여기에도 똑같이 쓸 수 있다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  -- public = true : 이 버킷의 파일은 URL만 알면 누구나 GET으로 볼 수 있다(로그인 불필요).
  -- /map이 비로그인 공개 화면이라 <img src="...">가 그냥 동작해야 하기 때문.
  -- 읽기만 열리는 것이고, 업로드는 아래 정책이 따로 막는다.
  true,
  -- 크기/형식 제한은 반드시 서버(=여기)에 둔다. 클라이언트 검사는 우회하면 그만이라
  -- 없으면 아무나 5GB짜리 파일을 밀어넣을 수 있다. 우리 캔버스 결과물은 JPEG 1~2MB 수준.
  5242880,                    -- 5MB (바이트 단위)
  array['image/jpeg']
)
-- 이 마이그레이션을 두 번 돌려도 에러가 나지 않게. 없으면 두 번째 실행이 통째로 실패한다.
on conflict (id) do nothing;

-- 업로드 권한. storage.objects 에는 이미 RLS가 켜져 있어서, 정책을 하나도 안 만들면
-- "아무도 못 올린다"가 기본값이다. 그래서 허용 규칙을 명시적으로 하나 열어준다.
--
-- name 컬럼 = 버킷 안에서의 파일 경로 문자열. 우리는 "<user_id>/<랜덤>.jpg" 로 올릴 것이다.
-- storage.foldername('abc-uid/xyz.jpg') 는 폴더 부분을 배열로 잘라 {abc-uid} 를 준다.
-- (Postgres 배열은 1부터 시작한다. [1]이 첫 칸.)
--
-- 즉 "폴더 이름이 곧 소유자"라는 규칙을 만들고, 그게 토큰에서 꺼낸 진짜 내 id와 같은지만 본다.
-- auth.uid()는 요청에 딸려온 JWT를 DB가 자기 비밀키로 검증해서 꺼낸 값이라 위조할 수 없다.
-- 결과: 로그인한 사람이, 자기 폴더에만 올릴 수 있다. 남의 사진 덮어쓰기 불가.
create policy "users can upload to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT/DELETE 정책은 일부러 안 만든다.
-- 읽기: public 버킷의 공개 URL은 RLS를 타지 않으므로 필요 없다.
-- 삭제: 태스크 9의 06:00 청소는 Edge Function이 service_role 키로 돌고, 그 키는 RLS를 통째로
--       무시한다. 지금 만들면 쓰이지 않는 정책만 늘어난다.
