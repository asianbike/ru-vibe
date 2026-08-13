"use client";

// useRef = "화면을 다시 그려도 값이 유지되지만, 바뀌어도 화면을 다시 그리진 않는 상자".
// 여기선 실제 <canvas> DOM 요소를 붙잡아 두는 데 쓴다(그림을 그리려면 요소 자체가 필요).
import { useEffect, useRef, useState } from "react";

// canvas = 그림을 그릴 수 있는 HTML 요소. 픽셀 하나하나를 코드로 칠할 수 있다.
// 여기서 하는 일: 진짜 폴라로이드 종이 사진(public/frame.jpg)을 깔고 → 그 흰 창 안에
// 유저 사진을 정사각형으로 오려 넣고 → 35mm 필름 스캔처럼 색을 손보고 →
// 아래 흰 여백에 위치·날짜·시간을 적는다. 결과물 한 장을 업로드한다.

// ── 종이 ────────────────────────────────────────────────────────────
// 프레임을 코드로 그리지 않고 **실물 사진을 쓴다.** 종이 질감·색 얼룩·모서리 곡선은
// 실제 스캔에만 있는 불규칙함이고, 그게 "진짜 물건" 인상의 정체다.
// 코드로 흉내 내면 아무리 공들여도 균일해서 인쇄물처럼 보인다.
//
// 아래 숫자는 public/frame.jpg 를 픽셀 단위로 재서 얻은 값이다(흰 창의 경계를 찾아서).
// 프레임 사진을 갈아끼우면 이 값도 다시 재야 한다.
const FRAME = {
  src: "/frame.jpg",
  w: 573, // 종이 전체 가로
  h: 684, // 종이 전체 세로
  x: 35, // 흰 창의 좌상단
  y: 30,
  s: 505, // 흰 창 한 변 (정확히는 505×506이라 정사각형으로 취급)
};

// 사진 한 변의 픽셀 수. 프레임 사진을 이 크기에 맞춰 확대해서 쓴다.
// iOS Safari는 캔버스가 너무 크면 에러도 없이 빈 이미지를 내놓는다(48MP 아이폰 사진이 여기 걸림).
//
// 1100 → 900 (2026-08-12). 화질 욕심이 아니라 **전송량** 때문이다:
// 완성된 카드 한 장이 700KB였는데, 지도 팝업은 그걸 통째로 받아서 200px로 줄여 보여준다.
// 50명이 쓰면 하루 수백 MB가 그 낭비로 나간다. 카드가 여전히 1000px 너비라
// 인스타 공유(1080 기준)에도 부족하지 않다.
const PHOTO_PX = 900;

// 프레임 이미지는 한 번만 받아서 재사용한다.
// 모듈 바깥(=컴포넌트 밖)에 두면 페이지를 오가도 살아 있어서, 재촬영할 때마다
// 같은 파일을 다시 받지 않는다. ??= 는 "비어 있을 때만 채워라".
let framePromise: Promise<HTMLImageElement> | null = null;
function loadFrame() {
  framePromise ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("frame image failed to load"));
    img.src = FRAME.src;
  });
  return framePromise;
}

// 아래 흰 여백에 적을 한 줄. 예: "📍 40.500, -74.448   2026.08.04  21:04"
// 실물 폴라로이드에 손으로 적던 자리다.
// 달 이름을 배열로 들고 있는 이유: toLocaleString()은 폰 언어 설정을 따라가서
// 한국어 폰에서는 "8월"이 나온다. 앱에 표시되는 문구는 전부 영어여야 한다.
const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

function caption(d: Date, coords: { lat: number; lng: number } | null) {
  // padStart(2, "0") = 한 자리 숫자 앞에 0을 붙여 두 자리로. 7 → "07"
  const p = (n: number) => String(n).padStart(2, "0");
  // getMonth()는 0부터 시작하는 게 자바스크립트 함정. 1월이 0이라 MONTHS[0]이 Jan이 맞다.
  const date = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  // 12시간제. 0시는 12 AM, 13시는 1 PM — %12는 0을 내놓으므로 || 12로 바꿔준다.
  const h = d.getHours();
  const time = `${h % 12 || 12}:${p(d.getMinutes())} ${h < 12 ? "AM" : "PM"}`;
  const when = `${date}  ${time}`;
  if (!coords) return when;

  // 소수점 3자리 = 약 110m. 화면(`/capture`)에는 5자리(≈1m)로 보여주지만
  // **사진에 새기는 건 3자리까지만** 한다. 이 이미지는 누구나 열 수 있는 public URL에
  // 올라가고 인스타로도 퍼진다 — 5자리면 어느 방에서 찍었는지가 그대로 박힌다.
  // 3자리면 "이 블록 어디쯤"이라는 분위기는 남고 집은 안 찍힌다.
  // 정밀도를 바꾸려면 아래 두 개의 3만 고치면 된다.
  return `📍 ${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}   ${when}`;
}

// 필름 그레인(입자)용 흑백 노이즈 타일을 만든다.
//
// 왜 타일인가: 사진 전체(1100×1100 = 121만 픽셀)에 픽셀 하나씩 난수를 넣으면 느리다.
// 작은 정사각형 하나만 만들어 바둑판처럼 반복해 깔면 눈으로는 구분이 안 되면서 훨씬 싸다.
// block = 입자 하나의 크기(px). 1이면 픽셀 단위, 2면 2×2 덩어리.
function grainPattern(ctx: CanvasRenderingContext2D, size = 96, block = 1, spread = 110) {
  // 먼저 작게 만든 뒤 확대해서 붙이면 입자가 덩어리로 커진다.
  const small = document.createElement("canvas");
  small.width = small.height = Math.round(size / block);
  const sctx = small.getContext("2d")!;

  // ImageData = 픽셀 배열 그 자체. [R,G,B,A, R,G,B,A, ...] 순으로 한 줄로 늘어서 있다.
  const img = sctx.createImageData(small.width, small.height);
  for (let i = 0; i < img.data.length; i += 4) {
    // 중간 회색(128)을 기준으로 위아래로 흔든다. 아래에서 overlay 모드로 얹을 때
    // 128은 "변화 없음"이라, 밝은 점은 밝게 어두운 점은 어둡게만 작용한다.
    const v = 128 + (Math.random() - 0.5) * spread;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255; // 불투명
  }
  sctx.putImageData(img, 0, 0);

  if (block === 1) return ctx.createPattern(small, "repeat")!;

  const tile = document.createElement("canvas");
  tile.width = tile.height = size;
  const tctx = tile.getContext("2d")!;
  // 확대할 때 보간을 끄면 픽셀이 뭉개지지 않고 각진 덩어리로 커진다.
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(small, 0, 0, size, size);
  return ctx.createPattern(tile, "repeat")!;
}

// 사진 영역에만 필름 색감을 입힌다. (x, y, s) = 사진의 좌상단과 한 변.
//
// 레퍼런스는 물 빠진 폴라로이드가 아니라 **35mm 필름 스캔**이다. 그래서 방향이 중요하다:
// 검정은 제대로 검고, 채도도 살아 있고, 전체가 오히려 차갑고 깨끗하다.
// 대비를 뭉개고 색을 빼면 필름이 아니라 그냥 흐린 사진이 된다.
//
// globalCompositeOperation = "이미 그려진 것과 새로 칠하는 것을 어떻게 섞을까".
// 기본값 source-over는 "덮어쓰기"라 사진이 그냥 가려진다. 아래 모드들은 다르게 섞는다.
function gradeFilm(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save(); // 지금 설정을 저장 — 아래에서 마구 바꾸고 마지막에 restore로 되돌린다

  // 사진 바깥(종이 여백)까지 물들면 안 되므로 그리는 범위를 사진 사각형으로 제한한다.
  ctx.beginPath();
  ctx.rect(x, y, s, s);
  ctx.clip();

  // ① 아주 옅은 찬 색. multiply = 곱하기 — 흰색을 곱하면 그대로, 어두운 값은 그만큼 깎인다.
  //    파랑이 높은 색을 곱하면 R·G만 살짝 깎여서 노란기가 빠진다.
  //    레퍼런스의 흰 벽·하늘이 차가운 쪽으로 기운 게 이 느낌이다. 세게 하면 사진이 죽는다.
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(224,235,255,0.22)";
  ctx.fillRect(x, y, s, s);

  // ② 검정을 아주 조금만 들어올린다. 필름도 완전한 0은 잘 안 나오지만,
  //    폴라로이드처럼 뿌옇게 뜨지는 않는다. 여기가 3300과 r1/r2가 갈리는 지점이다.
  ctx.globalCompositeOperation = "lighten";
  ctx.fillStyle = "rgb(30,34,39)";
  ctx.fillRect(x, y, s, s);

  // ③ 하이라이트에 아주 옅은 온기. screen = 밝게 섞기.
  //    ②가 그림자를 차갑게, ③이 밝은 쪽을 따뜻하게 만들어 색이 갈린다(split tone).
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "rgba(255,186,181,0.12)";
  ctx.fillRect(x, y, s, s);

  // ④ 비네팅 — 가장자리를 어둡게. 렌즈가 구석까지 빛을 못 보내서 생기는 현상이라
  //    이게 있으면 "찍힌 사진", 없으면 "만든 이미지"처럼 보인다.
  ctx.globalCompositeOperation = "source-over"; // 그냥 위에 덮기
  const cx = x + s / 2;
  const cy = y + s / 2;
  const vignette = ctx.createRadialGradient(cx, cy, s * 0.42, cx, cy, s * 0.8);
  vignette.addColorStop(0, "rgba(18,16,20,0)");
  vignette.addColorStop(1, "rgba(18,16,20,0.26)");
  ctx.fillStyle = vignette;
  ctx.fillRect(x, y, s, s);

  // ⑤ 필름 그레인. overlay = 밝은 곳은 더 밝게, 어두운 곳은 더 어둡게 (대비를 살린 합성).
  //    중간 회색은 아무 영향이 없어서 노이즈 타일과 짝이 맞는다.
  //    레퍼런스의 입자는 눈에 띄지만 거칠지 않다 — 두 층 다 예전보다 약하게.
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.18; // 굵은 층
  ctx.fillStyle = grainPattern(ctx, 96, 2, 130);
  ctx.fillRect(x, y, s, s);
  ctx.globalAlpha = 0.14; // 미세한 층 — 굵은 층만 있으면 격자무늬처럼 규칙적으로 보인다
  ctx.fillStyle = grainPattern(ctx, 96, 1, 110);
  ctx.fillRect(x, y, s, s);

  ctx.restore(); // clip·합성모드·alpha를 전부 원래대로
}

// onCapture는 "부모가 넘겨주는 함수". 사진을 다 그린 뒤 이걸 호출해서
// "끝났어"라고 부모(capture/page.tsx)에게 알린다. ?는 안 넘겨도 된다는 뜻.
export default function PolaroidCanvas({
  onCapture,
  coords,
}: {
  onCapture?: (canvas: HTMLCanvasElement) => void;
  // 촬영 시점엔 아직 없다. GPS는 셔터를 누른 뒤 몇 초 걸려서 도착하므로,
  // 사진은 먼저 그려두고 좌표가 오면 아래 여백에 한 줄만 덧그린다.
  // 흰 여백은 아무것도 안 그려진 자리라 덧그리기만 하면 되고, 사진을 다시 그릴 필요가 없다.
  coords?: { lat: number; lng: number } | null;
}) {
  // 처음엔 아직 <canvas>가 화면에 없으니 null. 아래 ref={canvasRef}가 연결해준다.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [captured, setCaptured] = useState(false); // 한 장이라도 찍었나 (버튼 문구/캔버스 표시용)
  const [status, setStatus] = useState(""); // 에러 메시지 (폰에서 원인을 눈으로 보려고)
  // 촬영한 순간. 캡션을 나중에 그릴 때 "그릴 때 시각"이 아니라 "찍은 시각"을 써야 한다.
  const shotAtRef = useRef<Date | null>(null);

  // 좌표가 도착하면 아래 여백에 캡션을 적는다. 재촬영하면 종이가 새로 깔리므로
  // 옛 캡션은 저절로 사라진다 — 지우는 코드가 따로 필요 없다.
  useEffect(() => {
    const canvas = canvasRef.current;
    const shotAt = shotAtRef.current;
    if (!canvas || !shotAt || !coords) return;

    const scale = canvas.width / FRAME.w;
    const ctx = canvas.getContext("2d")!;
    const fontSize = Math.round(PHOTO_PX * 0.046);
    // 폰에 실제로 깔려 있는 글꼴이라 파일을 받을 필요가 없다.
    // 쉼표 뒤는 대비책 — 앞의 것이 없는 기기에서 차례로 넘어간다(마지막은 "아무 고딕").
    ctx.font = `${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#4a4640"; // 새까맣게 하면 인쇄물처럼 딱딱해진다
    // 흰 여백의 세로 한가운데. 창 아래끝과 종이 아래끝의 중간이다.
    const stripMid = ((FRAME.y + FRAME.s) * scale + canvas.height) / 2;
    ctx.fillText(caption(shotAt, coords), canvas.width / 2, stripMid);
  }, [coords]);

  // async = 안에서 await를 쓸 수 있는 함수. await는 "이 작업 끝날 때까지 여기서 기다려".
  // 사진 디코딩과 프레임 다운로드가 시간이 걸리는 작업이라 기다려야 한다.
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
      //
      // Promise.all = 두 기다림을 나란히 시작해 둘 다 끝날 때까지 기다린다.
      // 순서대로 await하면 프레임을 받는 동안 사진 디코딩이 놀고 있다.
      const [bitmap, frame] = await Promise.all([
        createImageBitmap(file, { imageOrientation: "from-image" }),
        loadFrame(),
      ]);

      // ── 크기 계산 ──
      // 프레임 사진(573px)을 사진 한 변이 PHOTO_PX가 되도록 확대한다.
      const scale = PHOTO_PX / FRAME.s;
      canvas.width = Math.round(FRAME.w * scale);
      canvas.height = Math.round(FRAME.h * scale);
      const px = Math.round(FRAME.x * scale);
      const py = Math.round(FRAME.y * scale);
      const s = PHOTO_PX;

      // ctx(context) = 실제로 그리는 도구 모음. 붓이라고 생각하면 된다.
      // !는 "null 아님을 내가 보장한다"는 타입스크립트 표시.
      const ctx = canvas.getContext("2d")!;

      // ① 종이 사진을 통째로 깐다. 창은 흰색으로 칠해져 있고, 그 위에 사진을 얹을 것이다.
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

      // ② 유저 사진을 창에 맞춰 정사각형으로 오려 넣는다.
      //    폴라로이드는 정사각형이므로 원본 가운데에서 짧은 변 길이만큼 잘라낸다.
      const side = Math.min(bitmap.width, bitmap.height);
      const cropX = (bitmap.width - side) / 2;
      const cropY = (bitmap.height - side) / 2;

      // ctx.filter는 그리는 순간 적용되는 보정.
      // 채도·대비를 거의 안 건드리는 게 요점이다 — 레퍼런스는 물 빠진 사진이 아니다.
      // blur는 화질을 깎는 게 아니라 디지털 특유의 칼 같은 가장자리를 눕히는 용도.
      ctx.filter = "saturate(0.82) contrast(0.91) brightness(1.06) blur(0.45px)";
      ctx.drawImage(bitmap, cropX, cropY, side, side, px, py, s, s);
      ctx.filter = "none"; // 안 되돌리면 아래 글자와 각인에도 보정이 걸린다
      bitmap.close(); // 디코딩된 픽셀은 메모리를 많이 먹는다. 다 썼으니 즉시 반납.

      // ③ 필름 색감
      gradeFilm(ctx, px, py, s);

      // ④ 사진과 창 사이 경계선. 실물은 사진이 종이보다 살짝 안으로 들어가 있어 그늘이 진다.
      ctx.strokeStyle = "rgba(0,0,0,0.20)";
      ctx.lineWidth = Math.max(1, s * 0.002);
      ctx.strokeRect(px, py, s, s);

      shotAtRef.current = new Date();
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
      {/* ref로 위의 canvasRef와 이 요소를 연결한다. 아직 안 찍었으면 빈 캔버스를 숨긴다. */}
      <canvas ref={canvasRef} className={`mt-3 w-full shadow-lg ${captured ? "" : "hidden"}`} />
      {status && <p className="mt-2 text-sm break-words text-amber-600">{status}</p>}
    </>
  );
}
