"use client";

import { useEffect, useState } from "react";

// 처음 온 사람에게 이 앱이 뭔지 알려주는 카드.
//
// 왜 필요한가: 지금 /map을 열면 어두운 지도와 핀 몇 개가 전부다. 처음 온 사람은
// 이게 뭘 하는 앱인지, 핀이 왜 있는지, 자기가 뭘 할 수 있는지 알 방법이 없다.
// 앱스토어를 안 거치는 웹앱이라 설명을 읽고 들어오는 단계도 없다 —
// 링크를 받고 바로 화면에 떨어지는 게 대부분이다.
//
// 한 번 닫으면 다시 안 뜬다. InstallPrompt와 달리 접어두지 않는 이유:
// 설치 방법은 나중에 다시 찾을 일이 있지만, "이 앱이 뭔가"는 한 번 알면 끝이다.
const SEEN_KEY = "ru-vibe:welcome-seen";

export default function Welcome() {
  // null = 아직 판별 전. 서버에는 localStorage가 없어서 처음엔 알 수 없고,
  // false로 시작하면 이미 본 사람에게도 카드가 한 번 번쩍인다.
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(SEEN_KEY)) setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem(SEEN_KEY, "1");
    setShow(false);
  }

  return (
    // 반투명 검정 막(scrim)으로 지도를 덮는다. z-30 = 다른 배너들보다 위.
    // 처음 온 사람에겐 이게 먼저 읽혀야 하고, 어차피 한 번 보고 사라진다.
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-black shadow-xl">
        <h2 className="text-xl font-semibold">RU-Vibe</h2>
        <p className="mt-1 text-sm text-zinc-600">Tonight&apos;s map of Rutgers.</p>

        <p className="mt-4 text-sm">
          Every photo drops a pin where it was taken. Where the pins pile up, the map
          glows — that&apos;s where it&apos;s happening right now.
        </p>

        {/* ol = 순서 있는 목록. 숫자를 손으로 적지 않는 이유는 항목을 나중에
            사이에 끼워 넣어도 번호가 저절로 맞기 때문이다. */}
        <ol className="mt-4 space-y-2 text-sm">
          <li>
            <strong>1.</strong> Tap a pin to see the photo.
          </li>
          <li>
            <strong>2.</strong> Sign in with your Rutgers email to post — 3 photos a day.
          </li>
          <li>
            <strong>3.</strong> Everything wipes at 6 AM. The map is only ever tonight.
          </li>
        </ol>

        <button
          onClick={dismiss}
          className="mt-6 w-full rounded-full bg-red-700 px-4 py-2.5 text-white"
        >
          Show me the map
        </button>
      </div>
    </div>
  );
}
