import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RU-Vibe (The Scarlet Drop)",
    short_name: "RU-Vibe",
    // 앱에 표시되는 문구는 전부 영어 — 설치 화면에서 유저가 읽는 문장이다.
    description: "Live party heatmap for Rutgers.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#cc0033",
    icons: [],
  };
}
