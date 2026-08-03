// Mapbox는 브라우저의 화면(DOM)에 직접 그림을 그리는 라이브러리다.
// 서버에는 화면이 없으니 이 페이지는 반드시 브라우저에서 실행돼야 한다.
"use client";

// useEffect = "화면이 실제로 그려진 뒤에 실행해줘"라고 예약하는 React 함수.
// 왜 필요한가: 아래 return의 <div>는 React가 화면에 붙이기 전까진 실물이 없다.
// Mapbox에게 "이 <div> 안에 지도를 그려"라고 시키려면 실물이 생긴 뒤여야 한다.
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
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

    // useEffect가 돌려주는 함수 = "이 페이지를 떠날 때 실행할 뒷정리".
    // 지도는 WebGL 컨텍스트와 이벤트 리스너를 잡고 있어서, 안 지우면
    // 페이지를 오갈 때마다 메모리에 지도가 쌓인다.
    return () => {
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
