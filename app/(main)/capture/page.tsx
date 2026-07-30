"use client";

import { useState } from "react";
import PolaroidCanvas from "@/components/capture/PolaroidCanvas";

// 지도 핀 아이콘으로 쓰인다. 유저가 고르지 않고 랜덤 — 무드를 고민하게 만들면 게시가 느려진다.
const MOODS = ["🔥", "🎉", "🍻", "🎶", "😎", "💃"];

export default function CapturePage() {
  const [mood, setMood] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState("");

  // 사진이 캔버스에 그려진 직후 호출된다 (재촬영하면 다시 호출 → 무드도 다시 뽑힌다)
  function handleCapture() {
    setMood(MOODS[Math.floor(Math.random() * MOODS.length)]);
    setCoords(null);
    setGeoError("");

    // 콜백 방식 API. HTTPS(또는 localhost)에서만 동작하고, 권한 팝업 응답까지 시간이 걸린다.
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setGeoError(err.message),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Capture</h1>
      <div className="w-full max-w-sm">
        <PolaroidCanvas onCapture={handleCapture} />

        {mood && (
          <p className="mt-3 text-sm">
            <span className="text-lg">{mood}</span>{" "}
            {coords
              ? `· ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
              : geoError
                ? `· location unavailable — ${geoError}`
                : "· locating…"}
          </p>
        )}
      </div>
    </div>
  );
}
