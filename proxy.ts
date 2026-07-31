import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// middleware = 요청이 페이지에 닿기 "전"에 서버에서 먼저 실행되는 코드.
// 브라우저 → [middleware] → 페이지. 여기서 그냥 통과시킬 수도, 다른 곳으로 돌려보낼 수도 있다.
//
// 왜 필요한가: 지금은 로그인 안 한 사람도 /capture가 열린다. 사진을 찍고, 위치 권한을 허용하고,
// 측위를 기다린 다음 Post를 눌러야 비로소 "로그인하라"는 말을 듣는다. 헛수고를 다 시킨 뒤에
// 거절하는 셈이고, 게다가 /login으로 가는 순간 방금 찍은 사진이 날아간다(state는 탭 메모리).
// middleware는 카메라를 켜기도 전에 돌려보낸다.
//
// 이건 보안이 아니라 UX다. 실제 방어는 DB의 RLS 정책이고, middleware를 우회해서
// API를 직접 호출해도 거기서 막힌다. middleware는 그걸 대신하지 못한다.
export async function proxy(request: NextRequest) {
  // 통과시킬 때 돌려줄 응답. request를 넘기면 아래에서 갱신한 쿠키가 페이지까지 전달된다.
  let response = NextResponse.next({ request });

  // 서버에서 Supabase에 말을 걸 때는 쿠키를 직접 읽고 써줘야 한다.
  // 브라우저와 달리 서버에는 "현재 로그인 상태"가 자동으로 딸려오지 않기 때문이다.
  // lib/supabase/server.ts와 같은 일이지만, middleware는 next/headers의 cookies()를
  // 쓸 수 없어서(요청 객체가 따로 온다) 여기서 따로 만든다.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // 세션 토큰은 만료가 짧아서 Supabase가 조용히 갱신할 때가 있다. 그때 새 쿠키를
        // 여기로 넘겨주는데, 요청과 응답 양쪽에 다 심어야 한다 —
        // 요청 쪽: 이번 요청을 처리할 페이지가 새 토큰을 보게
        // 응답 쪽: 브라우저가 새 토큰을 저장하게. 안 하면 다음 요청에서 또 만료된 걸 보낸다.
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser()는 쿠키만 보고 판단하지 않고 Supabase 서버에 토큰을 검증받는다.
  // 쿠키는 유저가 조작할 수 있으니, 서버에서 판단할 땐 반드시 이걸 써야 한다.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // 돌려보낼 주소를 "요청 헤더"에서 조립한다. request.url을 쓰면 안 된다 —
    // Next는 그 값을 Host 헤더가 아니라 자기가 listen 중인 주소로 만들기 때문에,
    // 터널 뒤에서는 https://localhost:3000/login 같은 잡종이 나온다(CLAUDE.md 하드 러닝).
    //
    // 프록시(터널·Vercel)는 원래 주소를 x-forwarded-* 헤더에 담아 넘겨준다.
    // 프록시가 없는 로컬 개발에선 그 헤더가 없으므로 host / http로 떨어진다.
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    return NextResponse.redirect(new URL("/login", `${proto}://${host}`));
  }

  return response;
}

// matcher = 이 middleware를 어느 주소에서만 돌릴지. 안 적으면 이미지·CSS 요청 하나하나까지
// 전부 거쳐가면서 매번 Supabase에 검증 요청을 보내게 된다(느려지고 요금도 나간다).
// /map은 비로그인 공개라 여기 없다.
export const config = {
  matcher: ["/capture"],
};
