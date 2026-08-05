-- posts.mood 삭제.
--
-- 무드 이모지는 원래 지도 핀의 아이콘으로 쓰려던 값이었는데, 무드마다 핀 모양이
-- 달라지면 지도가 지저분해서 핀을 📍 하나로 통일했다(2026-08-02). 그 뒤로 이 컬럼은
-- 어디에서도 안 읽힌다 — 클라이언트가 랜덤으로 채워 넣고 아무도 안 보는 값이었다.
--
-- posts_archive도 같이 지워야 한다. reset_daily()가
--   insert into public.posts_archive select * from public.posts;
-- 로 옮기는데, 이건 컬럼 이름이 아니라 **순서**로 짝을 맞춘다. 한쪽만 지우면
-- 컬럼 수가 어긋나서 매일 06:00 리셋이 통째로 실패한다.

alter table public.posts drop column mood;
alter table public.posts_archive drop column mood;
