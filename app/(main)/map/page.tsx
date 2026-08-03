// Mapbox는 브라우저의 화면(DOM)에 직접 그림을 그리는 라이브러리다.
// 서버에는 화면이 없으니 이 페이지는 반드시 브라우저에서 실행돼야 한다.
"use client";

// useEffect = "화면이 실제로 그려진 뒤에 실행해줘"라고 예약하는 React 함수.
// 왜 필요한가: 아래 return의 <div>는 React가 화면에 붙이기 전까진 실물이 없다.
// Mapbox에게 "이 <div> 안에 지도를 그려"라고 시키려면 실물이 생긴 뒤여야 한다.
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
// 브라우저에서 Supabase에 말을 거는 도구. /capture에서 쓰던 것과 같은 파일이다.
import { createClient } from "@/lib/supabase/client";
// 지도의 확대 버튼, 로고, 팝업 같은 것들의 생김새를 정의한 CSS.
// 이걸 빼면 지도 타일은 나오는데 UI가 깨져서 엉뚱한 곳에 겹쳐 보인다.
import "mapbox-gl/dist/mapbox-gl.css";

// Rutgers New Brunswick 캠퍼스 전체(College Ave·Busch·Livingston·Cook/Douglass)가
// 한 화면에 들어오는 중심점과 배율.
//
// 주의: Mapbox는 좌표를 [경도(lng), 위도(lat)] 순서로 받는다.
// 우리가 흔히 말하는 "위도, 경도"와 반대다. posts 테이블도 lat/lng 순으로 저장하므로
// 태스크 7-2에서 마커를 찍을 때 순서를 뒤집어 넣어야 한다. 뒤집으면 에러 없이
// 지도 반대편(아프리카 앞바다)에 핀이 찍혀서 원인을 찾기 어렵다.
const CAMPUS_CENTER: [number, number] = [-74.448, 40.501];
const CAMPUS_ZOOM = 12.5;

// 게시물 하나를 지도 위의 마커 하나로 만들어 붙인다.
// 태스크 8(실시간)에서 새 글이 도착했을 때도 이 함수만 다시 부르면 된다.
function addMarker(map: mapboxgl.Map, post: Post) {
  // 클릭했을 때 뜨는 말풍선에 사진을 넣는다.
  //
  // setHTML(`<img src="${post.photo_url}">`) 처럼 문자열로 조립하면 안 된다.
  // photo_url은 유저가 INSERT한 값이라 따옴표를 닫고 <script>를 이어붙일 수 있고,
  // 그러면 /map을 여는 모든 사람의 브라우저에서 그 코드가 실행된다(XSS).
  // 아래처럼 요소를 만들어 .src에 넣으면 값은 언제나 "주소"로만 취급된다.
  const img = document.createElement("img");
  img.src = post.photo_url;
  img.width = 200;
  img.style.display = "block";

  // offset = 말풍선을 마커보다 이만큼 위에 띄운다. 기본 핀이 약 41px이라
  // 0이면 말풍선이 핀을 덮어버린다.
  const popup = new mapboxgl.Popup({ offset: 30 }).setDOMContent(img);

  // 핀 모양을 직접 만든다. element를 안 넘기면 Mapbox 기본 물방울 핀이 나온다.
  const pin = document.createElement("div");
  pin.textContent = "📍";
  pin.style.fontSize = "28px";
  pin.style.lineHeight = "1";
  pin.style.cursor = "pointer";

  // anchor: "bottom" = "이 요소의 아래쪽 끝"을 좌표에 맞춰라.
  // element를 직접 넘기면 Mapbox는 기본으로 요소의 한가운데를 좌표에 맞추는데,
  // 📍는 그림의 아래 뾰족한 끝이 가리키는 지점이다. 기본값 그대로 두면 핀이
  // 실제 위치보다 반 칸 아래를 가리키게 된다 — 확대해야 겨우 보이는 종류의 어긋남.
  //
  // setLngLat은 [경도, 위도] 순. posts 테이블은 lat/lng 순이라 여기서 뒤집힌다.
  // 뒤집힌 채로 넣어도 에러가 안 나고 지도 반대편에 조용히 찍히므로 눈으로 봐야 안다.
  new mapboxgl.Marker({ element: pin, anchor: "bottom" })
    .setLngLat([post.lng, post.lat])
    .setPopup(popup)
    .addTo(map);
}

// posts 테이블에서 지도에 필요한 칸만 받는다 — 전송량을 줄이려는 것이지 보안이 아니다.
// SELECT 정책이 using(true)라 방문자가 콘솔에서 직접 user_id를 뽑는 건 여전히 가능하다.
// 진짜로 가리려면 컬럼 권한을 빼거나 view를 따로 만들어야 한다.
type Post = {
  id: string;
  lat: number;
  lng: number;
  photo_url: string;
};

export default function MapPage() {
  // 지도를 그려 넣을 <div>의 실물을 붙잡아 두는 상자.
  // useState가 아니라 useRef인 이유: 이 값이 바뀌어도 화면에 새로 그릴 게 없다.
  const containerRef = useRef<HTMLDivElement | null>(null);
  // 만들어진 지도 객체 자체. 태스크 7-2에서 여기에 마커를 추가하게 된다.
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // 이 값은 빌드할 때 Next가 실제 토큰 문자열로 치환해 브라우저 JS에 박아 넣는다.
  // pk. 토큰은 원래 공개되는 값이라 괜찮다 — 진짜 방어선은 Mapbox 쪽의
  // 스코프 제한과 URL 제한이지, "아무도 모른다"가 아니다.
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    // 토큰이 없으면 Mapbox는 콘솔에만 에러를 남기고 화면은 새까맣게 둔다.
    // 여기서 미리 멈춰야 아래 화면의 안내문이 보인다.
    if (!token) return;
    // 이미 만들었으면 또 만들지 않는다. React는 개발 모드에서 일부러 useEffect를
    // 두 번 실행해 정리(cleanup)가 제대로 되는지 시험하는데, 이 줄이 없으면
    // 지도가 두 개 겹쳐 만들어진다.
    if (mapRef.current) return;

    mapboxgl.accessToken = token;

    mapRef.current = new mapboxgl.Map({
      // 어느 <div> 안에 그릴지. "!"는 "이 값이 null이 아님을 내가 보증한다"는
      // TypeScript 표시 — useEffect는 화면이 그려진 뒤에 도니까 실물이 반드시 있다.
      container: containerRef.current!,
      // 지도 그림체. 파티 앱이라 밤에 볼 일이 많으니 어두운 스타일.
      style: "mapbox://styles/mapbox/dark-v11",
      center: CAMPUS_CENTER,
      zoom: CAMPUS_ZOOM,
    });

    // 조회와 실시간 구독이 같은 클라이언트를 써야 한다.
    // createClient()를 두 번 부르면 웹소켓 연결이 두 개 생기고,
    // 아래 cleanup의 removeChannel이 자기가 만들지 않은 채널을 못 닫는다.
    const supabase = createClient();

    // 지금까지 올라온 게시물을 전부 가져와 마커로 찍는다.
    // 로그인 없이도 되는 이유: posts의 SELECT 정책이 using(true) — 태스크 6 랩에서
    // 키만 있으면 anon도 조회가 통과하는 걸 curl로 직접 확인했던 그 정책이다.
    // (매일 06:00에 비워지므로 양이 많아질 일이 없어 페이지네이션은 안 둔다)
    supabase
      .from("posts")
      .select("id, lat, lng, photo_url")
      .then(({ data, error }) => {
        if (error) {
          console.error("failed to load posts", error);
          return;
        }
        // 조회는 시간이 걸린다. 그 사이 유저가 페이지를 떠났으면 아래 cleanup이
        // 이미 돌아서 지도가 사라진 상태다. 없어진 지도에 마커를 붙이면 터진다.
        const map = mapRef.current;
        if (!map) return;
        data?.forEach((post) => addMarker(map, post));
      });

    // ── 여기부터 실시간 ──────────────────────────────────────────────
    // 위의 select는 "지금까지 쌓인 것"을 한 번 가져올 뿐이라, 이 뒤에 올라오는
    // 사진은 새로고침해야 보인다. 아래는 그 사이를 잇는다.
    //
    // channel = 서버와 열어두는 웹소켓 통로 하나. 이름은 우리가 붙이는 것이고
    // 서버는 이 통로로 "posts에 INSERT가 일어났다"를 밀어준다(push).
    // 우리가 3초마다 물어보는 게 아니라 서버가 알려주는 것 — 조용한 시간엔 통신이 0.
    const channel = supabase
      .channel("posts-inserts")
      .on(
        // "postgres_changes" = Postgres에서 일어난 데이터 변경을 받겠다는 뜻.
        // event를 "*"로 두면 UPDATE·DELETE도 오는데, 우리는 새 사진만 필요하다.
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          // payload.new = 방금 INSERT된 행 전체. 우리가 select에서 고른 칸만
          // 오는 게 아니라 모든 칸이 온다(user_id 포함) — 서버가 보내는 것이라
          // 우리 select와는 무관하다.
          console.log("realtime INSERT", payload.new);
          const map = mapRef.current;
          if (!map) return;
          addMarker(map, payload.new as Post);
        },
      )
      // subscribe()를 불러야 실제로 연결이 열린다. 안 부르면 위 설정만 해두고
      // 아무 일도 일어나지 않는다 — 에러도 안 난다.
      .subscribe((status) => console.log("realtime status", status));

    // useEffect가 돌려주는 함수 = "이 페이지를 떠날 때 실행할 뒷정리".
    // 지도는 WebGL 컨텍스트와 이벤트 리스너를, 채널은 웹소켓을 잡고 있어서
    // 안 닫으면 페이지를 오갈 때마다 쌓인다.
    return () => {
      supabase.removeChannel(channel);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]);

  if (!token) {
    return (
      <main className="flex h-dvh items-center justify-center p-6 text-center text-sm">
        Map is unavailable: missing Mapbox access token.
      </main>
    );
  }

  // h-dvh = 화면 높이 전체. vh와 달리 모바일 브라우저의 주소창이 접혔다 펴져도
  // 지도가 잘리거나 튀지 않는다.
  return <div ref={containerRef} className="h-dvh w-full" />;
}
