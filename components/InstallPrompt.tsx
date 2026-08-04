"use client";

import { useEffect, useState } from "react";

// 이 배너를 닫았다는 사실을 어디에 적어둘지 정하는 이름표.
// localStorage = 이 브라우저에 계속 남는 작은 저장소. state에만 적으면 새로고침하면
// 사라져서 배너가 매번 다시 뜬다.
const DISMISSED_KEY = "ru-vibe:install-hint-dismissed";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 1) service worker 등록.
    //    브라우저에게 "이 파일을 백그라운드에 올려둬"라고 부탁하는 한 줄이다.
    //    이게 없으면 public/sw.js는 그냥 서버에 놓인 파일일 뿐 아무 일도 안 한다.
    //    실패해도 앱은 멀쩡히 돌아간다(설치만 안 될 뿐) — 그래서 catch로 조용히 넘긴다.
    navigator.serviceWorker?.register("/sw.js").catch(() => {});

    // 2) 아이폰용 "홈 화면에 추가" 안내를 띄울지 결정.
    //
    //    navigator.standalone = 이 페이지가 홈 화면 아이콘으로 열렸는지. 애플만 있는 값이라
    //    TypeScript가 모른다 — 그래서 타입을 직접 붙여준다.
    //    이미 설치한 사람에게 "설치하세요"를 띄우면 안 되니까 확인한다.
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone;
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

    // 안드로이드/데스크톱 Chrome은 주소창에 설치 아이콘을 브라우저가 직접 띄워준다.
    // 아이폰만 그게 없어서 우리가 말로 알려줘야 한다.
    if (isIOS && !standalone && !localStorage.getItem(DISMISSED_KEY)) setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  }

  // 지도 위에 떠야 하므로 fixed + z-10. 아래쪽 📸 Post 버튼과 겹치지 않게 위쪽에 둔다.
  return (
    <div className="fixed top-16 right-4 left-4 z-10 flex items-start gap-3 rounded-lg bg-white/95 px-4 py-3 text-sm text-black shadow-lg">
      <p className="flex-1">
        Add RU-Vibe to your home screen — tap <strong>Share</strong>, then{" "}
        <strong>Add to Home Screen</strong>.
      </p>
      {/* aria-label = 화면을 못 보는 사람이 쓰는 낭독기가 읽어줄 이름.
          버튼 안의 글자가 "×" 하나뿐이라 그것만으로는 무슨 버튼인지 알 수 없다. */}
      <button onClick={dismiss} aria-label="Dismiss" className="px-1 text-zinc-500">
        ×
      </button>
    </div>
  );
}
