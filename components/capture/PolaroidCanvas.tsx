"use client";

// useRef = "화면을 다시 그려도 값이 유지되지만, 바뀌어도 화면을 다시 그리진 않는 상자".
// 여기선 실제 <canvas> DOM 요소를 붙잡아 두는 데 쓴다(그림을 그리려면 요소 자체가 필요).
import { useRef, useState } from "react";

// canvas = 그림을 그릴 수 있는 HTML 요소. 픽셀 하나하나를 코드로 칠할 수 있다.
// 우리가 하는 일: 유저 사진을 정사각형으로 자르고 → 색을 물 빠진 필름처럼 손보고
// → 폴라로이드 종이 위에 얹고 → 아래 여백에 날짜를 적는다. 그 결과물 한 장을 업로드한다.

// ── 폴라로이드 종이 비율 ────────────────────────────────────────────
// 실제 Polaroid 600 필름 치수: 종이 88×108mm, 사진 영역 79×79mm.
// 아래 값은 전부 "사진 한 변(S) 대비 몇 배인가"로 적었다. 픽셀로 박으면
// 해상도를 바꿀 때마다 다시 계산해야 하는데, 비율이면 S만 바꾸면 된다.
const BORDER_TOP = 4 / 79; // 위 여백
const BORDER_SIDE = 4.5 / 79; // 좌우 여백
const BORDER_BOTTOM = 25 / 79; // 아래 여백 — 여기가 넓은 게 폴라로이드의 정체성

// 종이 색. 순백(#fff)은 화면에서 튀어서 종이로 안 보인다.
// 노란 기를 뺀 오프화이트 — 레퍼런스 사진의 세피아 느낌은 피하기로 함.
const PAPER = "#eeece8";

// 사진 한 변의 픽셀 수. 종이 전체는 이것의 약 1.37배(=2050)가 된다.
// iOS Safari는 캔버스가 너무 크면 에러도 없이 빈 이미지를 내놓는다(48MP 아이폰 사진이 여기 걸림).
const PHOTO_PX = 1500;

// 사진에 찍을 날짜/시간 문자열. 예: "2026.08.04  21:04"
// toLocaleString()은 폰 언어 설정에 따라 결과가 달라져서 직접 조립한다.
function timestamp(d: Date) {
  // padStart(2, "0") = 한 자리 숫자 앞에 0을 붙여 두 자리로. 7 → "07"
  const p = (n: number) => String(n).padStart(2, "0");
  // getMonth()는 0부터 시작하는 게 자바스크립트 함정. 1월이 0이라 +1이 필요하다.
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}  ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 필름 그레인(입자)용 흑백 노이즈 타일을 만든다.
//
// 왜 타일인가: 사진 전체(1500×1500 = 225만 픽셀)에 픽셀 하나씩 난수를 넣으면 느리다.
// 작은 정사각형 하나만 만들어 바둑판처럼 반복해 깔면 눈으로는 구분이 안 되면서 훨씬 싸다.
function grainPattern(ctx: CanvasRenderingContext2D, size = 96) {
  const tile = document.createElement("canvas");
  tile.width = tile.height = size;
  const tctx = tile.getContext("2d")!;

  // ImageData = 픽셀 배열 그 자체. [R,G,B,A, R,G,B,A, ...] 순으로 한 줄로 늘어서 있다.
  const img = tctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    // 중간 회색(128)을 기준으로 위아래로 흔든다. 아래에서 overlay 모드로 얹을 때
    // 128은 "변화 없음"이라, 밝은 점은 밝게 어두운 점은 어둡게만 작용한다.
    const v = 128 + (Math.random() - 0.5) * 110;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255; // 불투명
  }
  tctx.putImageData(img, 0, 0);
  return ctx.createPattern(tile, "repeat")!;
}

// 사진 영역에만 필름 색감을 입힌다. (x, y, s) = 사진의 좌상단과 한 변.
//
// globalCompositeOperation = "이미 그려진 것과 새로 칠하는 것을 어떻게 섞을까".
// 기본값 source-over는 "덮어쓰기"라 사진이 그냥 가려진다. 아래 모드들은 다르게 섞는다.
function gradeFilm(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save(); // 지금 설정을 저장 — 아래에서 마구 바꾸고 마지막에 restore로 되돌린다

  // 사진 바깥(종이 여백)까지 물들면 안 되므로 그리는 범위를 사진 사각형으로 제한한다.
  ctx.beginPath();
  ctx.rect(x, y, s, s);
  ctx.clip();

  // ① 노란 기 빼기.
  //    multiply = 곱하기. 흰색(255)을 곱하면 그대로, 어두운 값을 곱하면 그만큼 깎인다.
  //    파랑이 높고 빨강/초록이 낮은 색을 곱하면 R·G만 살짝 깎여서 노란기가 줄어든다.
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(228,236,255,0.22)";
  ctx.fillRect(x, y, s, s);

  // ② 검정을 들어올린다(=물 빠진 느낌). 필름 사진이 디지털과 다르게 보이는 가장 큰 이유다.
  //    lighten = 채널별로 더 밝은 쪽을 택한다. 어두운 청록을 깔면 "이보다 어두운 픽셀은 없다"가 되어
  //    새까만 부분이 사라지고 그림자가 차갑게 뜬다. 밝은 부분은 전혀 안 건드려진다.
  ctx.globalCompositeOperation = "lighten";
  ctx.fillStyle = "rgb(32,38,42)";
  ctx.fillRect(x, y, s, s);

  // ③ 하이라이트에 연분홍. screen = 밝게 섞기(lighten과 달리 전체가 부드럽게 올라간다).
  //    ②가 그림자를 차갑게, ③이 밝은 쪽을 따뜻하게 만들어 색이 갈린다(split tone).
  //    이 어긋남이 "필름 같다"는 인상의 정체다.
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "rgba(255,186,190,0.10)";
  ctx.fillRect(x, y, s, s);

  // ④ 비네팅 — 가장자리를 어둡게. 렌즈가 구석까지 빛을 못 보내서 생기는 현상이라
  //    이게 있으면 "찍힌 사진", 없으면 "만든 이미지"처럼 보인다.
  ctx.globalCompositeOperation = "source-over"; // 그냥 위에 덮기
  const cx = x + s / 2;
  const cy = y + s / 2;
  const vignette = ctx.createRadialGradient(cx, cy, s * 0.34, cx, cy, s * 0.78);
  vignette.addColorStop(0, "rgba(20,18,24,0)");
  vignette.addColorStop(1, "rgba(20,18,24,0.26)");
  ctx.fillStyle = vignette;
  ctx.fillRect(x, y, s, s);

  // ⑤ 필름 그레인. overlay = 밝은 곳은 더 밝게, 어두운 곳은 더 어둡게 (대비를 살린 합성).
  //    중간 회색은 아무 영향이 없어서 노이즈 타일과 짝이 맞는다.
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = grainPattern(ctx);
  ctx.fillRect(x, y, s, s);

  ctx.restore(); // clip·합성모드·alpha를 전부 원래대로
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

      // ── 정사각형으로 자르기 ──
      // 폴라로이드는 정사각형이다. 원본의 가운데에서 짧은 변 길이만큼 오려낸다.
      // (sx, sy) = 원본에서 오려낼 위치, side = 오려낼 크기.
      const side = Math.min(bitmap.width, bitmap.height);
      const sx = (bitmap.width - side) / 2;
      const sy = (bitmap.height - side) / 2;

      // 사진 한 변. 원본이 작으면 억지로 늘리지 않는다(늘리면 뭉개진다).
      const s = Math.min(PHOTO_PX, side);

      // 사진의 좌상단 위치와 종이 전체 크기를 비율에서 계산한다.
      const px = Math.round(s * BORDER_SIDE);
      const py = Math.round(s * BORDER_TOP);
      canvas.width = Math.round(s + s * BORDER_SIDE * 2);
      canvas.height = Math.round(s + s * BORDER_TOP + s * BORDER_BOTTOM);

      // ctx(context) = 실제로 그리는 도구 모음. 붓이라고 생각하면 된다.
      // !는 "null 아님을 내가 보장한다"는 타입스크립트 표시.
      const ctx = canvas.getContext("2d")!;

      // ① 종이를 먼저 칠한다. 캔버스는 기본이 투명이라 안 칠하면 여백이 뚫려 보인다.
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ② 사진을 얹는다. ctx.filter는 그리는 순간 적용되는 보정 —
      //    채도를 낮추고(선명한 디지털 느낌 제거) 대비를 낮추고 살짝 밝게 해서
      //    아래 gradeFilm이 색을 입힐 여지를 만든다.
      ctx.filter = "saturate(0.82) contrast(0.88) brightness(1.06)";
      ctx.drawImage(bitmap, sx, sy, side, side, px, py, s, s);
      ctx.filter = "none"; // 안 되돌리면 아래 글자에도 보정이 걸린다
      bitmap.close(); // 디코딩된 픽셀은 메모리를 많이 먹는다. 다 썼으니 즉시 반납.

      // ③ 필름 색감 입히기
      gradeFilm(ctx, px, py, s);

      // ④ 사진과 종이 사이 경계선. 실물은 사진이 종이보다 살짝 안으로 들어가 있어
      //    가장자리에 얇은 그림자가 생긴다. 이게 없으면 사진이 종이에 뜬 스티커처럼 보인다.
      ctx.strokeStyle = "rgba(0,0,0,0.14)";
      ctx.lineWidth = Math.max(1, s * 0.002);
      ctx.strokeRect(px, py, s, s);

      // ⑤ 날짜는 사진 위가 아니라 아래 여백에 적는다.
      //    사진 위에 얹으면 배경이 밝은지 어두운지에 따라 안 보여서 테두리를 둘러야 했는데,
      //    종이 위에 적으면 배경색을 우리가 아니까 그냥 쓰면 된다. 실물 폴라로이드도 여기 적는다.
      const text = timestamp(new Date());
      const fontSize = Math.round(s * 0.05);
      ctx.font = `${fontSize}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#4a4640"; // 새까맣게 하면 인쇄물처럼 딱딱해진다
      ctx.fillText(text, canvas.width / 2, py + s + (s * BORDER_BOTTOM) / 2);

      setCaptured(true);
      setStatus("");
      // 부모가 onCapture를 넘겼으면 호출(= GPS 요청이 여기서 시작된다).
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
      {/* ref로 위의 canvasRef와 이 요소를 연결한다. 아직 안 찍었으면 빈 캔버스를 숨긴다.
          shadow = 종이가 화면 위에 놓인 것처럼 보이게. rounded는 뺐다 — 폴라로이드는 각지다. */}
      <canvas ref={canvasRef} className={`mt-3 w-full shadow-lg ${captured ? "" : "hidden"}`} />
      {status && <p className="mt-2 text-sm break-words text-amber-600">{status}</p>}
    </>
  );
}
