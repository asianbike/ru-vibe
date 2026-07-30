import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 리다이렉트 = "그 주소 말고 이쪽으로 다시 가라"는 302 응답. Location 헤더에 목적지를 적는다.
//
// 여기에 절대 주소(https://호스트/map)를 적으면 안 된다. 서버는 자기 주소를 확신할 수 없기
// 때문이다 — 개발용 터널(cloudflared)이나 배포 환경의 프록시를 거치면 우리 서버에 도착하는
// 요청의 Host 헤더는 이미 "localhost:3000"으로 바뀌어 있다. 그걸 믿고 조립하면
// "https://localhost:3000/map" 같은 잡종이 나오고, 폰에는 그런 주소가 없어서 접속이 죽는다.
//
// Location에는 상대 경로를 적어도 된다(HTTP 표준). 그러면 브라우저가 "내가 방금 요청한
// 주소"를 기준으로 알아서 붙인다. 서버가 모르는 걸 아는 쪽에 맡기는 셈이라 터널이든 배포든
// 그냥 맞는다. NextResponse.redirect()는 절대 주소만 받으므로 헤더를 직접 쓴다.
function redirect(path: string) {
  return new NextResponse(null, { status: 302, headers: { Location: path } });
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    // 메일 링크에 딸려온 1회용 code를 진짜 세션(쿠키)으로 바꾼다. 여기서 실제 로그인이 완료된다.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirect("/map");
    }
    console.error("exchangeCodeForSession failed:", error.message);
  } else {
    console.error("no code param on callback URL:", request.url);
  }

  return redirect("/login");
}
