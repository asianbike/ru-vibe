import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RU-Vibe (The Scarlet Drop)",
    short_name: "RU-Vibe",
    description: "Rutgers 실시간 언더그라운드 파티 히트맵",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#cc0033",
    icons: [],
  };
}
