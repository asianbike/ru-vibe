import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RU-Vibe (The Scarlet Drop)",
    short_name: "RU-Vibe",
    // 앱에 표시되는 문구는 전부 영어 — 설치 화면에서 유저가 읽는 문장이다.
    description: "Live party heatmap for Rutgers.",
    // 이 앱의 신분증. 안 적으면 브라우저가 start_url을 대신 신분증으로 쓴다 —
    // 그러면 나중에 시작 화면을 /feed 같은 데로 옮기는 순간 브라우저는 그걸 "다른 앱"으로
    // 보고, 이미 설치한 유저의 홈 화면 아이콘은 죽은 채로 남는다. 지금 값을 박아두면
    // start_url이 바뀌어도 같은 앱이다.
    id: "/map",
    // 홈 화면 아이콘을 눌렀을 때 열리는 주소. "/"로 두면 next.config.ts의
    // redirects()가 307로 /map에 다시 보내므로 앱을 열 때마다 왕복이 한 번 더 생긴다.
    start_url: "/map",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#cc0033",
    // 아이콘은 장식이 아니라 설치 조건이다 — 이 배열이 비어 있으면 브라우저가
    // "홈 화면에 추가"를 제안하지 않는다. 홈 화면에 그릴 그림이 없으니까.
    // 192는 홈 화면용, 512는 스플래시 화면과 앱 목록용. 안드로이드가 둘 다 요구한다.
    // (아이폰은 이 배열을 안 보고 app/apple-icon.png를 본다. Next가 파일 이름만 보고
    //  <link rel="apple-touch-icon">을 알아서 <head>에 넣어준다 — 우리가 쓸 코드는 없다)
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
