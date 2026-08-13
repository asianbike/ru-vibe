// "use client" = 이 파일의 코드를 "유저 폰의 브라우저에서 실행하라"는 표시.
// Next.js는 기본적으로 페이지를 서버에서 실행해 HTML만 만들어 보낸다(= 서버 컴포넌트).
// 서버에는 카메라도 GPS도 useState도 없다. 그래서 이 줄이 없으면 아래 코드는 에러가 난다.
"use client";

// useState = "화면에 반영돼야 하는 값"을 담는 상자를 만드는 React 함수.
// 그냥 let 변수에 담으면 값은 바뀌지만 React가 모르니까 화면이 안 바뀐다.
// useRef = "화면을 다시 그려도 유지되지만, 바뀌어도 화면을 다시 그리진 않는 상자".
import { useEffect, useRef, useState } from "react";
// 페이지 이동용 <a>. /map으로 돌아가는 길이 없으면 유저는 주소창을 직접 쳐야 한다.
import Link from "next/link";
import PolaroidCanvas from "@/components/capture/PolaroidCanvas";
// 브라우저에서 Supabase(우리 DB + 파일 저장소)에 말을 거는 도구.
import { createClient } from "@/lib/supabase/client";
import InAppBrowserBanner from "@/components/InAppBrowserBanner";


export default function CapturePage() {
  // useState(초기값)은 [현재값, 값을바꾸는함수] 두 개를 순서대로 돌려준다.
  // set...을 호출하면 React가 "값이 바뀌었다"는 걸 알고 이 함수를 처음부터 다시 실행해
  // 아래 return의 화면을 새로 그린다. 그래서 화면과 값이 항상 같이 움직인다.
  // 사진을 한 장이라도 찍었나. 캔버스는 useRef라 바뀌어도 화면이 안 그려지므로,
  // "찍은 뒤에만 보이는 UI"를 위해 화면에 반영되는 값이 따로 필요하다.
  const [shot, setShot] = useState(false);

  // 이 브라우저가 공유 시트를 열 수 있나.
  //
  // 처음엔 navigator.canShare({ files: [빈 File] })로 물어봤는데 iOS가 false를 돌려줬다.
  // 0바이트짜리 가짜 파일을 "공유할 수 없는 것"으로 판단한 것 — 우리는 "지원하니?"를
  // 물어본 셈이었지만 브라우저는 그 파일을 진짜로 검사했다. 그래서 버튼이 안 떴다.
  // 실물이 있어야 답할 수 있는 질문이라, 여기선 기능의 존재만 보고 나머지는 눌렀을 때 판단한다.
  // (useEffect 안에서 보는 이유: 서버에는 navigator가 없어 하이드레이션이 어긋난다)
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState("");

  // 업로드 중인가. 버튼을 잠가서 같은 사진이 두 번 올라가는 걸 막는 용도
  // (느리면 유저는 반드시 두 번 누른다).
  const [posting, setPosting] = useState(false);
  // 게시 완료했나. 완료 후 버튼을 잠가 중복 게시를 막는다. 재촬영하면 다시 false.
  const [posted, setPosted] = useState(false);
  // 유저에게 보여줄 결과/에러 한 줄.
  const [status, setStatus] = useState("");

  // 캔버스 요소 자체를 붙잡아 둔다. 여기서 픽셀을 꺼내 업로드할 것이다.
  // useState가 아니라 useRef인 이유: 이 값이 바뀌어도 화면에 새로 그릴 게 없다.
  // (DOM 요소를 state에 넣으면 매번 불필요한 렌더가 돈다)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 사진이 캔버스에 다 그려진 직후 PolaroidCanvas가 이 함수를 불러준다.
  // (재촬영하면 또 불리니까 무드도 좌표도 새로 뽑힌다)
  function handleCapture(canvas: HTMLCanvasElement) {
    canvasRef.current = canvas;
    setShot(true);

    // 이전 사진의 좌표/에러/게시상태가 남아있으면 안 되니 비운다.
    setCoords(null);
    setGeoError("");
    setPosted(false);
    setStatus("");

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

  // [Post] 버튼을 눌렀을 때. 여기가 태스크 6의 본체다.
  // 흐름: 캔버스 → JPEG 파일 → Storage 업로드 → 그 파일의 공개 주소 → posts에 행 1개 INSERT
  async function handlePost() {
    const canvas = canvasRef.current;
    if (!canvas || !coords) return; // 버튼이 이미 막고 있지만, 타입상 여기서도 확인이 필요

    setPosting(true);
    setStatus("");

    try {
      const supabase = createClient();

      // 1) 내가 누구인지 확인. 파일을 넣을 폴더 이름이자 posts.user_id로 쓸 값.
      //    로그인 안 했으면 user가 null이다(태스크 6-3의 middleware가 생기면 여기까지 못 옴).
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus("Sign in with your Rutgers email to post.");
        return;
      }

      // 2) 캔버스(픽셀 덩어리) → JPEG 파일 덩어리(Blob).
      //    toBlob은 옛날 API라 "다 되면 이 함수 불러줘" 콜백 방식이다. await로 기다리려면
      //    Promise로 감싸야 한다 — resolve를 콜백 자리에 그대로 넘기면 결과가 await로 나온다.
      //    JPEG 품질. 1.0은 눈에 띄는 차이 없이 파일만 3배 커진다(폰 데이터 낭비).
      //
      //    0.85 → 0.75 (2026-08-12). 보통 이 정도로 낮추면 뭉갠 자국이 보이는데
      //    이 사진은 필름 그레인이 이미 깔려 있어서 그 자국을 덮어버린다.
      //    (그레인이 파일을 키운 원인이기도 하다 — JPEG은 비슷한 색이 뭉친 곳을 잘 줄이는데
      //     그레인은 픽셀마다 값이 튀는 노이즈라 정확히 그 반대다)
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.75),
      );
      if (!blob) throw new Error("Could not encode the photo.");

      // 3) 파일 경로를 정한다. 폴더 이름 = 내 user id 여야 한다 —
      //    Storage 정책이 "폴더 이름 == 토큰에서 꺼낸 진짜 내 id"만 통과시키기 때문.
      //    파일명은 랜덤 UUID. 같은 사람이 여러 장 올려도 이름이 겹치지 않는다.
      const path = `${user.id}/${crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      // 4) 방금 올린 파일의 공개 주소를 얻는다.
      //    이건 네트워크 요청이 아니라 문자열 조립이다(프로젝트 주소 + 버킷 + 경로).
      const { data: { publicUrl } } = supabase.storage.from("photos").getPublicUrl(path);

      // 5) 지도에 찍힐 행 1개를 INSERT. 사진 바이트는 이미 Storage에 있고 여기엔 주소만 남는다.
      //    user_id를 클라이언트가 채워도 안전하다 — DB 정책이 auth.uid()와 같은지 검사한다.
      const { error: insertError } = await supabase.from("posts").insert({
        user_id: user.id,
        photo_url: publicUrl,
        lat: coords.lat,
        lng: coords.lng,
      });
      if (insertError) throw insertError;

      setPosted(true);
      setStatus("Posted! It's on the map."); // 태스크 7에서 실제 /map으로 보낼 자리
    } catch (err) {
      // 하루 3장 제한에 걸리면 DB가 거절하는데, 그 메시지가
      // "new row violates row-level security policy..."라는 암호문으로 온다.
      // 42501 = Postgres의 "권한 없음" 코드. 유저가 읽을 수 있는 문장으로 바꿔준다.
      const code = (err as { code?: string }).code;
      setStatus(
        code === "42501"
          ? "You've hit today's limit of 3 photos. Comes back at 6 AM."
          : `Upload failed — ${(err as Error).message}`,
      );
    } finally {
      // finally는 성공이든 에러든 무조건 실행된다.
      // 여기 안 넣고 try 끝에만 두면, 에러가 났을 때 버튼이 영영 잠긴 채로 남는다.
      setPosting(false);
    }
  }

  // 게시한 폴라로이드를 인스타 등으로 내보낸다.
  //
  // navigator.share = 브라우저가 **OS의 공유 시트**를 열어주는 기능. 우리가 인스타를
  // 직접 아는 게 아니라 "이 파일 좀 어디론가 보내줘"라고 OS에 맡기는 것이라,
  // 유저 폰에 깔린 앱이 뭐든 거기 다 뜬다(인스타·메시지·에어드랍·사진 저장…).
  //
  // 인스타를 콕 집어 여는 방법(instagram-stories:// 스킴)도 있는데, 앱이 깔려 있는지
  // 확인할 방법이 없어서 안 깔린 유저에겐 아무 일도 안 일어난다. 공유 시트는 그 문제가 없다.
  async function handleShare() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) return;

    // File은 Blob에 "파일 이름"과 "종류"를 붙인 것. 공유 시트가 미리보기를 그리려면 필요하다.
    const file = new File([blob], "ru-vibe.jpg", { type: "image/jpeg" });

    try {
      await navigator.share({ files: [file] });
    } catch {
      // 유저가 공유 시트를 그냥 닫아도 여기로 온다(거절도 예외로 전달된다).
      // 실수도 에러도 아니므로 아무 말 안 한다.
    }
  }

  // 좌표는 세 가지 상태를 가진다: 아직 기다리는 중 / 실패 / 성공.
  // JSX 안에서 if를 쓸 수 없어서, 화면에 넣을 문구를 미리 여기서 정해둔다.
  let locationText = "📍 locating…";
  if (coords) locationText = `📍 ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
  else if (geoError) locationText = `📍 location unavailable — ${geoError}`;

  // 게시 가능한 조건: 좌표가 잡혔고, 업로드 중이 아니고, 아직 안 올렸을 것.
  // lat/lng가 DB에서 not null이라 좌표 없이는 INSERT 자체가 불가능하다.
  const canPost = Boolean(coords) && !posting && !posted;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
      {/* 화면 왼쪽 위에 고정. 이 페이지는 가운데 정렬(justify-center)이라 흐름 안에 두면
          사진과 함께 위아래로 움직인다. fixed로 빼면 항상 같은 자리에 있다. */}
      <Link href="/map" className="fixed top-4 left-4 text-sm underline">
        ← Map
      </Link>

      <h1 className="text-2xl font-semibold">Capture</h1>

      <InAppBrowserBanner />

      {/* 위치 권한을 왜 물어보는지 미리 말해준다. 사진을 찍자마자 iOS가 권한 팝업을
          띄우는데, 이유를 모르면 반사적으로 거부하는 사람이 많다. 한 번 거부하면
          브라우저가 그 답을 기억해서 다시 물어보지도 않고, 유저는 설정에 들어가야 한다.
          좌표가 잡히면(coords) 이 문장은 할 일이 끝났으므로 사라진다. */}
      {!coords && (
        <p className="w-full max-w-sm text-center text-sm text-zinc-500">
          Allow location when asked — that&apos;s what puts your pin on the map.
        </p>
      )}

      <div className="w-full max-w-sm">
        {/* onCapture로 우리 함수를 넘겨준다 = "사진 다 그렸으면 이걸 불러라" */}
        <PolaroidCanvas onCapture={handleCapture} coords={coords} />

        {/* 아직 안 찍었으면 && 뒤쪽은 아예 화면에 안 나온다 */}
        {shot && (
          <>
            <p className="mt-3 text-sm">{locationText}</p>

            {/* disabled면 브라우저가 클릭 자체를 무시한다. 눌리지 않는다는 걸
                눈으로도 알 수 있게 흐리게(opacity) 처리한다. */}
            <button
              onClick={handlePost}
              disabled={!canPost}
              className="mt-3 w-full rounded bg-red-700 px-3 py-2 text-white disabled:opacity-40"
            >
              {posting ? "Posting…" : posted ? "Posted" : "Post"}
            </button>
            {/* 게시한 뒤에만 뜬다 — 올리기도 전에 공유부터 하면 지도에 안 남는다 */}
            {posted && canShare && (
              <button
                onClick={handleShare}
                className="mt-2 w-full rounded border border-zinc-400 px-3 py-2"
              >
                Share to Instagram &amp; more
              </button>
            )}
          </>
        )}

        {status && <p className="mt-2 text-sm break-words text-amber-600">{status}</p>}
      </div>
    </div>
  );
}
