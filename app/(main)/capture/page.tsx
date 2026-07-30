// "use client" = 이 파일의 코드를 "유저 폰의 브라우저에서 실행하라"는 표시.
// Next.js는 기본적으로 페이지를 서버에서 실행해 HTML만 만들어 보낸다(= 서버 컴포넌트).
// 서버에는 카메라도 GPS도 useState도 없다. 그래서 이 줄이 없으면 아래 코드는 에러가 난다.
"use client";

// useState = "화면에 반영돼야 하는 값"을 담는 상자를 만드는 React 함수.
// 그냥 let 변수에 담으면 값은 바뀌지만 React가 모르니까 화면이 안 바뀐다.
import { useState } from "react";
import PolaroidCanvas from "@/components/capture/PolaroidCanvas";

// 지도 핀 아이콘으로 쓸 이모지 후보들.
// 유저가 직접 고르게 하지 않고 랜덤으로 뽑는다 — 고민하게 만들면 게시가 느려진다.
const MOODS = ["🔥", "🎉", "🍻", "🎶", "😎", "💃"];

export default function CapturePage() {
  // useState(초기값)은 [현재값, 값을바꾸는함수] 두 개를 순서대로 돌려준다.
  // set...을 호출하면 React가 "값이 바뀌었다"는 걸 알고 이 함수를 처음부터 다시 실행해
  // 아래 return의 화면을 새로 그린다. 그래서 화면과 값이 항상 같이 움직인다.
  //
  // 주의: 이 값들은 지금 이 탭의 메모리에만 있다. 새로고침하면 전부 사라진다.
  // DB(Supabase)에 남기는 건 태스크 6에서 여기 있는 값을 꺼내 INSERT로 보내는 일.
  const [mood, setMood] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState("");

  // 사진이 캔버스에 다 그려진 직후 PolaroidCanvas가 이 함수를 불러준다.
  // (재촬영하면 또 불리니까 무드도 좌표도 새로 뽑힌다)
  function handleCapture() {
    // Math.random()은 0 이상 1 미만의 소수. 개수를 곱하고 소수점을 버리면 0~5 중 하나.
    setMood(MOODS[Math.floor(Math.random() * MOODS.length)]);

    // 이전 사진의 좌표/에러가 남아있으면 안 되니 비운다.
    setCoords(null);
    setGeoError("");

    // GPS 측정은 즉시 끝나지 않는다(권한 팝업 + 위성/와이파이 측위에 몇 초).
    // 그래서 "결과를 돌려주는" 함수가 아니라 "다 되면 이 함수를 불러줘"라고
    // 함수 두 개를 맡기는 형태다(= 콜백). 성공용 하나, 실패용 하나.
    // HTTPS나 localhost가 아니면 아예 동작하지 않는다(CLAUDE.md의 터널 참고).
    navigator.geolocation.getCurrentPosition(
      // 성공: pos 안에 위도(latitude)/경도(longitude)가 들어온다. DB 컬럼 이름에 맞춰 담는다.
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      // 실패: 권한 거부, 실내에서 측위 실패, 10초 초과 등.
      (err) => setGeoError(err.message),
      // enableHighAccuracy: 배터리를 더 써서 정확한 위치를 요청(핀이 건물 단위로 찍혀야 함).
      // timeout: 10초 안에 못 잡으면 실패 콜백으로 넘긴다. 없으면 무한정 "locating…"에 갇힌다.
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // 좌표는 세 가지 상태를 가진다: 아직 기다리는 중 / 실패 / 성공.
  // JSX 안에서 if를 쓸 수 없어서, 화면에 넣을 문구를 미리 여기서 정해둔다.
  let locationText = "· locating…";
  if (coords) locationText = `· ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
  else if (geoError) locationText = `· location unavailable — ${geoError}`;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Capture</h1>
      <div className="w-full max-w-sm">
        {/* onCapture로 우리 함수를 넘겨준다 = "사진 다 그렸으면 이걸 불러라" */}
        <PolaroidCanvas onCapture={handleCapture} />

        {/* mood가 빈 문자열이면(=아직 안 찍었으면) && 뒤쪽은 아예 화면에 안 나온다 */}
        {mood && (
          <p className="mt-3 text-sm">
            <span className="text-lg">{mood}</span> {locationText}
          </p>
        )}
      </div>
    </div>
  );
}
