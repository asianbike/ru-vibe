"use client";

// useRef = "화면을 다시 그려도 값이 유지되지만, 바뀌어도 화면을 다시 그리진 않는 상자".
// 여기선 실제 <canvas> DOM 요소를 붙잡아 두는 데 쓴다(그림을 그리려면 요소 자체가 필요).
import { useRef, useState } from "react";

// canvas = 그림을 그릴 수 있는 HTML 요소. 픽셀 하나하나를 코드로 칠할 수 있다.
// 우리가 하는 일: 유저 사진을 캔버스에 깔고 → 그 위에 날짜/시간을 글자로 얹는다.
// 그래야 "사진에 타임스탬프가 박힌" 하나의 이미지가 된다(나중에 이걸 업로드).
//
// iOS Safari는 캔버스 픽셀 수가 너무 크면 에러도 없이 그냥 빈 이미지를 내놓는다.
// 48MP 아이폰 사진(8064×6048)이 여기 걸리므로 긴 변을 2048px로 제한한다.
const MAX_EDGE = 2048;

// 사진에 찍을 날짜/시간 문자열을 만든다. 예: "2026.07.29  21:04"
// toLocaleString()은 폰 언어 설정에 따라 결과가 달라져서 직접 조립한다.
function timestamp(d: Date) {
  // padStart(2, "0") = 한 자리 숫자 앞에 0을 붙여 두 자리로. 7 → "07"
  const p = (n: number) => String(n).padStart(2, "0");
  // getMonth()는 0부터 시작하는 게 자바스크립트 함정. 1월이 0이라 +1이 필요하다.
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}  ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// onCapture는 "부모가 넘겨주는 함수". 사진을 다 그린 뒤 이걸 호출해서
// "끝났어"라고 부모(capture/page.tsx)에게 알린다. ?는 안 넘겨도 된다는 뜻.
export default function PolaroidCanvas({
  onCapture,
}: {
  onCapture?: (canvas: HTMLCanvasElement) => void;
}) {
  // 처음엔 아직 <canvas>가 화면에 없으니 null. 아래 ref={canvasRef}가 연결해준다.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [captured, setCaptured] = useState(false); // 한 장이라도 찍었나 (버튼 문구/캔버스 표시용)
  const [status, setStatus] = useState(""); // 에러 메시지 (폰에서 원인을 눈으로 보려고)

  // async = 안에서 await를 쓸 수 있는 함수. await는 "이 작업 끝날 때까지 여기서 기다려".
  // 사진 디코딩은 시간이 걸리는 작업이라 기다려야 한다.
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    // <input type="file">이 고른 파일들 중 첫 번째. ?.는 "없으면 undefined" (에러 대신).
    const file = e.target.files?.[0];
    // 값을 비워두지 않으면 같은 사진을 다시 골랐을 때 "변경 없음"으로 취급돼 onChange가 안 뜬다.
    e.target.value = "";
    if (!file) return; // 유저가 취소한 경우

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // 파일은 압축된 JPEG 덩어리라 그대로는 그릴 수 없다. 픽셀로 펼치는(디코딩) 단계.
      // imageOrientation으로 EXIF 회전 정보를 반영하지 않으면 세로로 찍은 사진이 눕는다.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

      // 긴 변이 2048을 넘으면 그 비율만큼 줄인다. 안 넘으면 scale은 1(그대로).
      const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
      // 캔버스의 width/height는 "몇 픽셀짜리 도화지인가"를 정한다(CSS 크기와 별개).
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);

      // ctx(context) = 실제로 그리는 도구 모음. 붓이라고 생각하면 된다.
      // !는 "null 아님을 내가 보장한다"는 타입스크립트 표시.
      const ctx = canvas.getContext("2d")!;
      // (0,0)은 좌상단. 캔버스 전체 크기에 맞춰 사진을 깐다.
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close(); // 디코딩된 픽셀은 메모리를 많이 먹는다. 다 썼으니 즉시 반납.

      const text = timestamp(new Date());
      // 글자 크기를 px로 고정하면 고해상도 사진에선 깨알같이 작아진다.
      // 사진 너비의 4.5%로 잡으면 어떤 해상도에서도 같은 비율로 보인다.
      const size = Math.round(canvas.width * 0.045);
      const margin = size; // 가장자리에서 글자 한 칸만큼 띄운다

      ctx.font = `${size}px ui-monospace, monospace`;
      ctx.textAlign = "right"; // 좌표를 글자의 오른쪽 끝으로 해석하게 한다
      ctx.textBaseline = "bottom"; // 좌표를 글자의 아래쪽 끝으로 해석하게 한다
      // → 즉 아래 좌표는 "오른쪽 아래 모서리"를 의미하게 된다

      // 흰 배경(눈, 하늘)에 밝은 글자를 그냥 얹으면 안 보인다.
      // 먼저 어두운 테두리(stroke)를 굵게 깔고, 그 위에 밝은 글자(fill)를 채운다.
      ctx.lineWidth = Math.max(2, size * 0.12);
      ctx.strokeStyle = "rgba(0,0,0,0.65)";
      ctx.strokeText(text, canvas.width - margin, canvas.height - margin);
      ctx.fillStyle = "#ffb300";
      ctx.fillText(text, canvas.width - margin, canvas.height - margin);

      setCaptured(true);
      setStatus("");
      // 부모가 onCapture를 넘겼으면 호출(= GPS 요청과 무드 뽑기가 여기서 시작된다).
      onCapture?.(canvas);
    } catch (err) {
      // 폰에는 개발자 콘솔이 없으니 에러를 화면에 띄워 원인을 본다.
      setStatus(`${(err as Error).name} — ${(err as Error).message}`);
    }
  }

  return (
    <>
      {/* 버튼을 따로 만들지 않고 <label>로 감싼다 — label을 탭하면 안의 input이 눌린다.
          input을 hidden으로 숨겨도 동작하므로 파일 선택창의 못생긴 기본 UI를 안 보여줄 수 있다.
          capture="environment" — 탭하면 앨범이 아니라 후면 카메라가 바로 열린다. */}
      <label className="block cursor-pointer rounded bg-red-700 px-3 py-2 text-center text-white">
        {captured ? "Retake" : "Take photo"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
      </label>
      {/* ref로 위의 canvasRef와 이 요소를 연결한다. 아직 안 찍었으면 빈 캔버스를 숨긴다. */}
      <canvas ref={canvasRef} className={`mt-2 w-full rounded ${captured ? "" : "hidden"}`} />
      {status && <p className="mt-2 text-sm break-words text-amber-600">{status}</p>}
    </>
  );
}
