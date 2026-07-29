import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 폰 실기기 테스트용 터널(cloudflared) 주소에서 오는 dev 요청 허용.
  // 없으면 Next가 HMR 웹소켓을 막고, 그 여파로 하이드레이션까지 죽어 버튼이 먹통이 된다.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
