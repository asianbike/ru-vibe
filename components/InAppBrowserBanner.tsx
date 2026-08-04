"use client";

import { useEffect, useState } from "react";
import { isInAppBrowser } from "@/lib/in-app-browser";

// /map과 /capture 양쪽에 뜬다.
//
// 원래는 /capture에만 뒀는데 그건 너무 늦다. 인스타에서 링크를 열고 → 지도를 구경하고
// → 로그인까지 마친 다음에야 "Safari로 옮기세요"를 보게 되는데, 세션 쿠키는 브라우저마다
// 따로라 Safari에서 처음부터 다시 로그인해야 한다. 로그인 버튼을 누르기 전에 알려야
// 그 헛수고가 없다.
export default function InAppBrowserBanner() {
  // useEffect 안에서 판별하는 이유 —
  // 이 컴포넌트는 "use client"여도 첫 HTML은 Next 서버가 미리 만들어 보낸다. 서버에는
  // navigator가 없으니 서버는 항상 false로 그리는데, 브라우저가 그 HTML을 이어받을 때
  // (하이드레이션) 서버가 그린 것과 다른 결과가 나오면 React가 화면을 통째로 버리고
  // 다시 그린다. useEffect는 그 이어받기가 끝난 뒤에 도니까 어긋날 일이 없다.
  const [inApp, setInApp] = useState(false);
  useEffect(() => setInApp(isInAppBrowser()), []);

  if (!inApp) return null;

  // 앱에서 Safari를 코드로 열 수는 없다 — iOS가 막아놨다. 그래서 안내밖에 못 한다.
  return (
    <div className="fixed top-0 right-0 left-0 z-20 bg-amber-400 px-4 py-2 text-center text-sm text-black">
      Location is blocked in in-app browsers, so you can&apos;t post from here. Tap{" "}
      <strong>•••</strong> → <strong>Open in Safari</strong> before you sign in.
    </div>
  );
}
