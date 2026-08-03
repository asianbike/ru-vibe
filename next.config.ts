import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 폰 실기기 테스트용 터널(cloudflared) 주소에서 오는 dev 요청 허용.
  // 없으면 Next가 HMR 웹소켓을 막고, 그 여파로 하이드레이션까지 죽어 버튼이 먹통이 된다.
  allowedDevOrigins: ["*.trycloudflare.com"],

  // 이 앱의 첫 화면은 지도다. "/"로 들어온 사람을 /map으로 보낸다.
  //
  // app/page.tsx에 redirect("/map") 한 줄을 두는 방법도 있는데, 그러면 Next가
  // 페이지 컴포넌트를 만들고 실행해서야 "다른 데로 가라"를 알게 된다.
  // 여기 적으면 렌더링 전에 처리되고, 무엇보다 파일 하나가 통째로 없어진다.
  //
  // permanent: false = 307. true(308)로 하면 브라우저가 이 리다이렉트를 영구
  // 캐시해서, 나중에 "/"에 소개 화면을 만들어도 유저 브라우저는 계속 /map으로 간다.
  // 캐시를 지우기 전까지 되돌릴 방법이 없다.
  async redirects() {
    return [{ source: "/", destination: "/map", permanent: false }];
  },
};

export default nextConfig;
