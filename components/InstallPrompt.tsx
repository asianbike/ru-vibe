"use client";

import { useEffect, useState } from "react";
import { isInAppBrowser } from "@/lib/in-app-browser";

// 배너를 접어뒀다는 사실을 어디에 적어둘지 정하는 이름표.
// localStorage = 이 브라우저에 계속 남는 작은 저장소. state에만 적으면 새로고침할 때마다
// 배너가 펼쳐진 채로 다시 뜬다.
const COLLAPSED_KEY = "ru-vibe:install-hint-collapsed";

export default function InstallPrompt() {
  // 화면 상태가 3가지다: 안 보임(설치했거나 아이폰이 아님) / 접힘 / 펼침.
  // null = 아직 판별 전. 서버가 그린 HTML과 어긋나지 않게 하려고 이 상태로 시작한다.
  const [mode, setMode] = useState<null | "collapsed" | "expanded">(null);

  useEffect(() => {
    // 1) service worker 등록.
    //    브라우저에게 "이 파일을 백그라운드에 올려둬"라고 부탁하는 한 줄이다.
    //    이게 없으면 public/sw.js는 그냥 서버에 놓인 파일일 뿐 아무 일도 안 한다.
    //    실패해도 앱은 멀쩡히 돌아간다(설치만 안 될 뿐) — 그래서 catch로 조용히 넘긴다.
    navigator.serviceWorker?.register("/sw.js").catch(() => {});

    // 2) 안내를 띄울지 결정.
    //
    //    navigator.standalone = 이 페이지가 홈 화면 아이콘으로 열렸는지. 애플만 있는 값이라
    //    TypeScript가 모른다 — 그래서 타입을 직접 붙여준다.
    //    이미 설치한 사람에게 "설치하세요"를 띄우면 안 되니까 확인한다.
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone;
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

    // 안드로이드/데스크톱 Chrome은 주소창에 설치 아이콘을 브라우저가 직접 띄워준다.
    // 아이폰만 그게 없어서 우리가 말로 알려줘야 한다.
    // 인앱 브라우저에서는 "홈 화면에 추가" 자체가 불가능하다. 거기선 InAppBrowserBanner가
    // "Safari로 열어라"를 이미 띄우고 있으니 안내가 두 개 겹치는 것도 막는다.
    if (!isIOS || standalone || isInAppBrowser()) return;

    setMode(localStorage.getItem(COLLAPSED_KEY) ? "collapsed" : "expanded");
  }, []);

  if (!mode) return null;

  function collapse() {
    localStorage.setItem(COLLAPSED_KEY, "1");
    setMode("collapsed");
  }

  // 접힌 상태 = 작은 알약 하나. 여기가 핵심이다 —
  // 닫아도 사라지지 않고 줄어들기만 한다. PWA 설치는 처음 해보는 사람이 대부분이라
  // 한 번 닫았다고 방법이 화면에서 영영 없어지면 다시는 찾을 수 없다.
  if (mode === "collapsed") {
    return (
      <button
        onClick={() => setMode("expanded")}
        className="fixed top-14 left-4 z-10 rounded-full bg-white/90 px-3 py-1.5 text-sm text-black shadow"
      >
        📲 Install
      </button>
    );
  }

  return (
    <div className="fixed top-28 right-4 left-4 z-10 flex items-start gap-3 rounded-lg bg-white/95 px-4 py-3 text-sm text-black shadow-lg">
      <p className="flex-1">
        Add RU-Vibe to your home screen — tap <strong>Share</strong> at the bottom of
        Safari, then <strong>Add to Home Screen</strong>.
      </p>
      {/* aria-label = 화면을 못 보는 사람이 쓰는 낭독기가 읽어줄 이름.
          버튼 안의 글자가 "×" 하나뿐이라 그것만으로는 무슨 버튼인지 알 수 없다. */}
      <button onClick={collapse} aria-label="Collapse" className="px-1 text-zinc-500">
        ×
      </button>
    </div>
  );
}
